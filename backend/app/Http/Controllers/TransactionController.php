<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\InventoryMovement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionController extends Controller
{
    /**
     * Display a listing of the transactions.
     */
    public function index()
    {
        $transactions = Transaction::with(['items.product', 'customer', 'cashier'])
            ->latest()
            ->get();
            
        return response()->json($transactions);
    }
    /**
     * Store a newly created transaction in storage.
     */
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'payment_method' => 'required|string|in:CASH,QRIS,TRANSFER,CARD',
            'payment_amount' => 'required|numeric|min:0',
            // customer_id and cashier_id are optional for now
            'customer_id' => 'nullable|exists:customers,id',
            'cashier_id' => 'nullable|exists:users,id',
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

            // Tax calculation (e.g. 11%)
            $taxRate = 0.11;
            $tax = $subtotal * $taxRate;
            $discount = 0; // Assuming 0 for now
            $totalAmount = $subtotal + $tax - $discount;

            // Generate Transaction Number (e.g., TRX-20231024-ABC1)
            $transactionNumber = 'TRX-' . date('Ymd') . '-' . strtoupper(Str::random(4));

            // 2. Create Transaction
            $transaction = Transaction::create([
                'transaction_number' => $transactionNumber,
                'customer_id' => $request->customer_id,
                'cashier_id' => $request->cashier_id,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'discount' => $discount,
                'total_amount' => $totalAmount,
                'payment_amount' => $request->payment_amount,
                'payment_method' => $request->payment_method,
                'status' => 'COMPLETED',
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
                    'user_id' => $request->cashier_id,
                ]);
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
}
