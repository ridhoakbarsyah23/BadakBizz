<?php

namespace App\Http\Controllers;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Get inventory movements history
     */
    public function movements(Request $request)
    {
        $query = DB::table('inventory_movements')
            ->join('products', 'inventory_movements.product_id', '=', 'products.id')
            ->leftJoin('product_variants', 'inventory_movements.variant_id', '=', 'product_variants.id')
            ->select(
                'inventory_movements.*',
                'products.name as product_name',
                'products.sku',
                'product_variants.name as variant_name',
                'product_variants.sku as variant_sku',
            )
            ->orderBy('inventory_movements.created_at', 'desc');

        if ($request->has('per_page')) {
            $perPage = $request->query('per_page', 10);

            return response()->json($query->paginate($perPage));
        }

        return response()->json($query->get());
    }

    /**
     * Restock a product
     */
    public function restock(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $product = Product::lockForUpdate()->findOrFail($request->product_id);
            $variant = null;

            if ($product->has_variants) {
                if (! $request->filled('variant_id')) {
                    throw new \Exception('Variant is required for this product.');
                }

                $variant = ProductVariant::lockForUpdate()
                    ->where('product_id', $product->id)
                    ->find($request->variant_id);

                if (! $variant) {
                    throw new \Exception('Variant not found for this product.');
                }

                $variant->increment('stock', $request->quantity);
            } else {
                if ($request->filled('variant_id')) {
                    throw new \Exception('Variant can only be assigned to products with variants.');
                }

                $product->increment('stock', $request->quantity);
            }

            // Record movement
            InventoryMovement::create([
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'type' => 'IN',
                'quantity' => $request->quantity,
                'notes' => $request->notes ?? 'Manual restock'.($variant ? ' - '.$variant->name : ''),
                'user_id' => $request->user()?->id,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Stok berhasil ditambahkan',
                'product' => $product->fresh(['variants']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Gagal menambahkan stok: '.$e->getMessage(),
            ], 400);
        }
    }

    /**
     * Adjust stock to match a physical stock count.
     */
    public function adjust(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'variant_id' => 'nullable|exists:product_variants,id',
            'actual_stock' => 'required|integer|min:0',
            'reason' => 'required|string|max:255',
        ]);

        try {
            DB::beginTransaction();

            $product = Product::lockForUpdate()->findOrFail($request->product_id);
            $variant = null;
            $currentStock = (int) $product->stock;

            if ($product->has_variants) {
                if (! $request->filled('variant_id')) {
                    throw new \Exception('Variant is required for this product.');
                }

                $variant = ProductVariant::lockForUpdate()
                    ->where('product_id', $product->id)
                    ->find($request->variant_id);

                if (! $variant) {
                    throw new \Exception('Variant not found for this product.');
                }

                $currentStock = (int) $variant->stock;
            } elseif ($request->filled('variant_id')) {
                throw new \Exception('Variant can only be assigned to products with variants.');
            }

            $actualStock = (int) $request->actual_stock;
            $difference = $actualStock - $currentStock;

            if ($difference === 0) {
                throw new \Exception('Stock is already equal to the actual count.');
            }

            if ($variant) {
                $variant->update(['stock' => $actualStock]);
            } else {
                $product->update(['stock' => $actualStock]);
            }

            InventoryMovement::create([
                'product_id' => $product->id,
                'variant_id' => $variant?->id,
                'type' => 'ADJUSTMENT',
                'quantity' => $difference,
                'notes' => 'Stock adjustment: '.$request->reason.' ('.$currentStock.' -> '.$actualStock.')',
                'user_id' => $request->user()?->id,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Stok berhasil disesuaikan',
                'product' => $product->fresh(['variants']),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Gagal menyesuaikan stok: '.$e->getMessage(),
            ], 400);
        }
    }
}
