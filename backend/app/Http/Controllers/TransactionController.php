<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\InventoryMovement;
use App\Models\Customer;
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
        $query = Transaction::with(['items.product', 'customer', 'cashier'])
            ->latest();
            
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

            // 1. Calculate totals and prepare items
            foreach ($request->items as $itemData) {
                $product = Product::lockForUpdate()->find($itemData['product_id']);
                
                if (!$product) {
                    throw new \Exception("Product not found.");
                }

                if ($product->stock < $itemData['quantity']) {
                    throw new \Exception("Insufficient stock for product: " . $product->name);
                }

                $itemSubtotal = $product->selling_price * $itemData['quantity'];
                $subtotal += $itemSubtotal;

                $transactionItemsData[] = [
                    'product' => $product,
                    'quantity' => $itemData['quantity'],
                    'price' => $product->selling_price,
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
                throw new \Exception("Discount cannot be greater than subtotal.");
            }

            $store = Store::first();
            $taxRatePercent = $store?->tax_rate ?? 11;
            $serviceChargeRatePercent = $store?->service_charge_rate ?? 0;

            $netAfterDiscount = $subtotal - $discount;
            $serviceCharge = $netAfterDiscount * ($serviceChargeRatePercent / 100);
            $tax = ($netAfterDiscount + $serviceCharge) * ($taxRatePercent / 100);
            $totalAmount = $netAfterDiscount + $serviceCharge + $tax;

            // Generate Transaction Number (e.g., TRX-20231024-ABC1)
            $transactionNumber = 'TRX-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            // Find active shift
            $activeShift = null;
            if ($request->user()) {
                $activeShift = \App\Models\CashierShift::where('user_id', $request->user()->id)
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
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);

                // Decrement stock
                $product->decrement('stock', $item['quantity']);

                // Record movement
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'type' => 'OUT',
                    'quantity' => $item['quantity'],
                    'notes' => 'Sales Transaction ' . $transaction->transaction_number,
                    'user_id' => $request->user() ? $request->user()->id : null,
                ]);
            }

            // 4. Update Customer Spending
            if (isset($validated['customer_id']) && $validated['customer_id']) {
                $customer = Customer::find($validated['customer_id']);
                if ($customer) {
                    $customer->increment('total_transactions');
                    $customer->increment('total_spending', $totalAmount);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Transaction completed successfully.',
                'data' => $transaction->load('items.product')
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to process transaction.',
                'error' => $e->getMessage()
            ], 400);
        }
    }
    public function voidTransaction(Request $request, $id)
    {
        try {
            DB::beginTransaction();

            $transaction = Transaction::with('items.product')->find($id);

            if (!$transaction) {
                return response()->json(['message' => 'Transaction not found'], 404);
            }

            if ($transaction->status !== 'COMPLETED') {
                return response()->json(['message' => 'Transaction cannot be voided (Status is ' . $transaction->status . ')'], 400);
            }

            // Restore stock and record movement
            foreach ($transaction->items as $item) {
                if ($item->product) {
                    $item->product->increment('stock', $item->quantity);

                    InventoryMovement::create([
                        'product_id' => $item->product_id,
                        'type' => 'IN',
                        'quantity' => $item->quantity,
                        'notes' => 'Void Transaction ' . $transaction->transaction_number,
                        'user_id' => $request->user() ? $request->user()->id : null,
                    ]);
                }
            }

            // Adjust Customer total if needed
            if ($transaction->customer_id) {
                $customer = Customer::find($transaction->customer_id);
                if ($customer) {
                    $customer->decrement('total_transactions');
                    $customer->decrement('total_spending', $transaction->total_amount);
                }
            }

            // Update Status
            $transaction->update(['status' => 'CANCELLED']);

            DB::commit();

            return response()->json([
                'message' => 'Transaction has been successfully voided.',
                'data' => $transaction
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to void transaction.',
                'error' => $e->getMessage()
            ], 400);
        }
    }
}
