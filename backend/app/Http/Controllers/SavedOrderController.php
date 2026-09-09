<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\SavedOrder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SavedOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $orders = SavedOrder::query()
            ->where('user_id', $request->user()->id)
            ->with(['items.product', 'items.variant', 'customer', 'table'])
            ->latest('updated_at')
            ->get()
            ->map(fn (SavedOrder $order) => $this->present($order));

        return response()->json($orders);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateOrder($request);
        $items = $this->prepareItems($validated['items']);

        $order = DB::transaction(function () use ($request, $validated, $items) {
            $order = SavedOrder::create([
                ...$this->orderAttributes($validated),
                'user_id' => $request->user()->id,
            ]);

            $order->items()->createMany($items);

            return $order;
        });

        return response()->json($this->present($this->loadOrder($order)), 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        return response()->json($this->present($this->ownedOrder($request, $id)));
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $order = $this->ownedOrder($request, $id);
        $validated = $this->validateOrder($request);
        $items = $this->prepareItems($validated['items']);

        DB::transaction(function () use ($order, $validated, $items) {
            $order->update($this->orderAttributes($validated));
            $order->items()->delete();
            $order->items()->createMany($items);
        });

        return response()->json($this->present($this->loadOrder($order->fresh())));
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->ownedOrder($request, $id)->delete();

        return response()->json(null, 204);
    }

    private function ownedOrder(Request $request, int $id): SavedOrder
    {
        return $this->loadOrder(
            SavedOrder::where('user_id', $request->user()->id)->findOrFail($id)
        );
    }

    private function loadOrder(SavedOrder $order): SavedOrder
    {
        return $order->load(['items.product', 'items.variant', 'customer', 'table']);
    }

    private function validateOrder(Request $request): array
    {
        return $request->validate([
            'name' => 'required|string|max:80',
            'customer_id' => 'nullable|exists:customers,id',
            'table_id' => 'nullable|exists:tables,id',
            'order_type' => 'required|string|in:dine_in,takeaway',
            'custom_discount_percent' => 'nullable|numeric|min:0|max:100',
            'notes' => 'nullable|string|max:255',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1|max:9999',
            'items.*.notes' => 'nullable|string|max:255',
        ]);
    }

    private function prepareItems(array $items): array
    {
        return collect($items)->map(function (array $item, int $index) {
            $product = Product::findOrFail($item['product_id']);
            $variant = null;

            if (! $product->is_active) {
                throw ValidationException::withMessages([
                    "items.{$index}.product_id" => "Produk {$product->name} sedang tidak aktif.",
                ]);
            }

            if ($product->has_variants) {
                if (empty($item['variant_id'])) {
                    throw ValidationException::withMessages([
                        "items.{$index}.variant_id" => "Varian wajib dipilih untuk produk {$product->name}.",
                    ]);
                }

                $variant = ProductVariant::withTrashed()
                    ->where('product_id', $product->id)
                    ->find($item['variant_id']);

                if (! $variant || $variant->trashed()) {
                    throw ValidationException::withMessages([
                        "items.{$index}.variant_id" => "Varian untuk produk {$product->name} tidak tersedia.",
                    ]);
                }
            } elseif (! empty($item['variant_id'])) {
                throw ValidationException::withMessages([
                    "items.{$index}.variant_id" => "Produk {$product->name} tidak menggunakan varian.",
                ]);
            }

            return [
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'product_name' => $product->name,
                'variant_name' => $variant?->name,
                'unit_price' => (float) $product->selling_price + (float) ($variant?->price_adjustment ?? 0),
                'quantity' => $item['quantity'],
                'notes' => isset($item['notes']) ? trim((string) $item['notes']) ?: null : null,
            ];
        })->all();
    }

    private function orderAttributes(array $validated): array
    {
        return [
            'name' => trim($validated['name']),
            'customer_id' => $validated['customer_id'] ?? null,
            'table_id' => $validated['order_type'] === 'dine_in' ? ($validated['table_id'] ?? null) : null,
            'order_type' => $validated['order_type'],
            'custom_discount_percent' => $validated['custom_discount_percent'] ?? 0,
            'notes' => isset($validated['notes']) ? trim((string) $validated['notes']) ?: null : null,
        ];
    }

    private function present(SavedOrder $order): array
    {
        $items = $order->items->map(function ($item) {
            $product = $item->product;
            $variant = $item->variant;
            $available = $product && $product->is_active;

            if ($available && $product->has_variants) {
                $available = $variant && ! $variant->trashed() && $variant->product_id === $product->id;
            } elseif ($available) {
                $available = $item->variant_id === null;
            }

            $currentPrice = $available
                ? (float) $product->selling_price + (float) ($variant?->price_adjustment ?? 0)
                : null;

            return [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'variant_id' => $item->variant_id,
                'product_name' => $item->product_name,
                'variant_name' => $item->variant_name,
                'display_name' => $available
                    ? $product->name.($variant ? ' - '.$variant->name : '')
                    : $item->product_name.($item->variant_name ? ' - '.$item->variant_name : ''),
                'unit_price' => (float) $item->unit_price,
                'current_price' => $currentPrice,
                'current_stock' => $available ? (int) ($variant?->stock ?? $product->stock) : 0,
                'quantity' => $item->quantity,
                'notes' => $item->notes,
                'is_available' => (bool) $available,
                'price_changed' => $currentPrice !== null && abs($currentPrice - (float) $item->unit_price) > 0.001,
            ];
        });

        return [
            'id' => $order->id,
            'name' => $order->name,
            'customer_id' => $order->customer_id,
            'customer_name' => $order->customer?->name,
            'table_id' => $order->table_id,
            'table_name' => $order->table?->name,
            'order_type' => $order->order_type,
            'custom_discount_percent' => (float) $order->custom_discount_percent,
            'notes' => $order->notes,
            'item_count' => $items->sum('quantity'),
            'estimated_total' => $items->sum(fn (array $item) => ($item['current_price'] ?? $item['unit_price']) * $item['quantity']),
            'items' => $items->values(),
            'created_at' => $order->created_at,
            'updated_at' => $order->updated_at,
        ];
    }
}
