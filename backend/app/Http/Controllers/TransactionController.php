<?php

namespace App\Http\Controllers;

use App\Models\CashierShift;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Services\TransactionStatusService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionController extends Controller
{
    /**
     * Display a listing of the transactions.
     */
    public function index(Request $request)
    {
        $query = Transaction::with(['items.product', 'items.variant', 'customer', 'cashier', 'table'])
            ->latest();

        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'ALL') {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('start_date')) {
            $query->where('created_at', '>=', Carbon::parse($request->start_date)->startOfDay());
        }

        if ($request->filled('end_date')) {
            $query->where('created_at', '<=', Carbon::parse($request->end_date)->endOfDay());
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', '%'.$search.'%')
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', '%'.$search.'%');
                    });
            });
        }

        if ($request->has('per_page')) {
            return response()->json($query->paginate($request->per_page));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created transaction in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.variant_id' => 'nullable|exists:product_variants,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|string|in:CASH,QRIS,TRANSFER,CARD',
            'payment_amount' => 'required|numeric|min:0',
            // customer_id and cashier_id are optional for now
            'customer_id' => 'nullable|exists:customers,id',
            'cashier_id' => 'nullable|exists:users,id',
            'discount' => 'nullable|numeric|min:0',
            'order_type' => 'nullable|string|in:dine_in,takeaway',
            'table_id' => 'nullable|exists:tables,id',
        ]);

        try {
            DB::beginTransaction();

            $subtotal = 0;
            $transactionItemsData = [];
            $table = null;

            if (($validated['order_type'] ?? 'dine_in') === 'dine_in' && isset($validated['table_id'])) {
                $table = Table::lockForUpdate()->find($validated['table_id']);

                if (! $table) {
                    throw new \Exception('Table not found.');
                }

                if ($table->status !== 'available') {
                    throw new \Exception('Table is not available.');
                }
            } elseif (isset($validated['table_id'])) {
                throw new \Exception('Table can only be assigned to dine-in orders.');
            }

            // 1. Calculate totals and prepare items
            foreach ($request->items as $itemData) {
                $product = Product::lockForUpdate()->find($itemData['product_id']);

                if (! $product) {
                    throw new \Exception('Product not found.');
                }

                $variant = null;
                $stock = $product->stock;
                $price = $product->selling_price;
                $itemName = $product->name;

                if ($product->has_variants) {
                    if (! isset($itemData['variant_id'])) {
                        throw new \Exception('Variant is required for product: '.$product->name);
                    }

                    $variant = ProductVariant::lockForUpdate()
                        ->where('product_id', $product->id)
                        ->find($itemData['variant_id']);

                    if (! $variant) {
                        throw new \Exception('Variant not found for product: '.$product->name);
                    }

                    $stock = $variant->stock;
                    $price = $product->selling_price + $variant->price_adjustment;
                    $itemName = $product->name.' - '.$variant->name;
                } elseif (isset($itemData['variant_id'])) {
                    throw new \Exception('Variant can only be assigned to products with variants.');
                }

                if ($stock < $itemData['quantity']) {
                    throw new \Exception('Insufficient stock for product: '.$itemName);
                }

                $itemSubtotal = $price * $itemData['quantity'];
                $subtotal += $itemSubtotal;

                $transactionItemsData[] = [
                    'product' => $product,
                    'variant' => $variant,
                    'quantity' => $itemData['quantity'],
                    'price' => $price,
                    'subtotal' => $itemSubtotal,
                ];
            }

            // Discount calculation
            $discount = 0;
            if (isset($validated['discount'])) {
                $discount = $validated['discount'];
            } elseif (isset($validated['customer_id']) && $validated['customer_id']) {
                $discount = $subtotal * 0.05; // 5% discount default for members
            }

            if ($discount > $subtotal) {
                throw new \Exception('Discount cannot be greater than subtotal.');
            }

            $store = Store::first();
            $taxRatePercent = $store?->tax_rate ?? 11;
            $serviceChargeRatePercent = $store?->service_charge_rate ?? 0;

            $netAfterDiscount = $subtotal - $discount;
            $serviceCharge = $netAfterDiscount * ($serviceChargeRatePercent / 100);
            $tax = ($netAfterDiscount + $serviceCharge) * ($taxRatePercent / 100);
            $totalAmount = $netAfterDiscount + $serviceCharge + $tax;

            // Generate Transaction Number (e.g., TRX-20231024-ABC1)
            $transactionNumber = 'TRX-'.date('Ymd').'-'.strtoupper(Str::random(4));

            // Find active shift
            $activeShift = null;
            if ($request->user()) {
                $activeShift = CashierShift::where('user_id', $request->user()->id)
                    ->where('status', 'open')
                    ->first();
            }

            // 2. Create Transaction
            $transaction = Transaction::create([
                'transaction_number' => $transactionNumber,
                'customer_id' => $validated['customer_id'] ?? null,
                'cashier_id' => $request->user() ? $request->user()->id : null,
                'cashier_shift_id' => $activeShift ? $activeShift->id : null,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'service_charge' => $serviceCharge,
                'discount' => $discount,
                'total_amount' => $totalAmount,
                'payment_amount' => $validated['payment_amount'],
                'payment_method' => $validated['payment_method'],
                'status' => $validated['payment_method'] === 'QRIS' ? 'PENDING' : 'COMPLETED',
                'order_type' => $validated['order_type'] ?? 'dine_in',
                'table_id' => $validated['table_id'] ?? null,
            ]);

            // 3. Create Items, Update Stock, Create Inventory Movements
            foreach ($transactionItemsData as $item) {
                $product = $item['product'];

                TransactionItem::create([
                    'transaction_id' => $transaction->id,
                    'product_id' => $product->id,
                    'variant_id' => $item['variant'] ? $item['variant']->id : null,
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);

                if ($item['variant']) {
                    $item['variant']->decrement('stock', $item['quantity']);
                } else {
                    $product->decrement('stock', $item['quantity']);
                }

                // Record movement
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'variant_id' => $item['variant'] ? $item['variant']->id : null,
                    'type' => 'OUT',
                    'quantity' => $item['quantity'],
                    'notes' => 'Sales Transaction '.$transaction->transaction_number.($item['variant'] ? ' - '.$item['variant']->name : ''),
                    'user_id' => $request->user() ? $request->user()->id : null,
                ]);
            }

            if ($table) {
                $table->update(['status' => 'occupied']);
            }

            // 4. Update Customer Spending for completed payments only.
            if ($transaction->status === 'COMPLETED') {
                app(TransactionStatusService::class)->incrementCustomerTotals($transaction);
                app(TransactionStatusService::class)->complete($transaction);
            }

            DB::commit();

            return response()->json([
                'message' => 'Transaction completed successfully.',
                'data' => $transaction->load(['items.product', 'items.variant']),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();

            return response()->json([
                'message' => 'Failed to process transaction.',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function voidTransaction(Request $request, $id)
    {
        try {
            $transaction = Transaction::with(['items.product', 'items.variant'])->find($id);

            if (! $transaction) {
                return response()->json(['message' => 'Transaction not found'], 404);
            }

            if ($transaction->status !== 'COMPLETED') {
                return response()->json(['message' => 'Transaction cannot be voided (Status is '.$transaction->status.')'], 400);
            }

            $transaction = app(TransactionStatusService::class)->cancel(
                $transaction,
                $request->user() ? $request->user()->id : null,
                'Void Transaction'
            );

            return response()->json([
                'message' => 'Transaction has been successfully voided.',
                'data' => $transaction,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to void transaction.',
                'error' => $e->getMessage(),
            ], 400);
        }
    }

    public function cancelPendingQris(Request $request, $id)
    {
        try {
            $transaction = Transaction::with(['items.product', 'items.variant'])->find($id);

            if (! $transaction) {
                return response()->json(['message' => 'Transaction not found'], 404);
            }

            if ($transaction->payment_method !== 'QRIS' || $transaction->status !== 'PENDING') {
                return response()->json(['message' => 'Only pending QRIS transactions can be cancelled from this action'], 400);
            }

            $transaction = app(TransactionStatusService::class)->cancel(
                $transaction,
                $request->user() ? $request->user()->id : null,
                'Cancel Pending QRIS'
            );

            return response()->json([
                'message' => 'Pending QRIS transaction has been cancelled.',
                'data' => $transaction,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to cancel pending QRIS transaction.',
                'error' => $e->getMessage(),
            ], 400);
        }
    }
}
