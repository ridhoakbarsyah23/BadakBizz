<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    /**
     * Get inventory movements history
     */
    public function movements()
    {
        $movements = DB::table('inventory_movements')
            ->join('products', 'inventory_movements.product_id', '=', 'products.id')
            ->select('inventory_movements.*', 'products.name as product_name', 'products.sku')
            ->orderBy('inventory_movements.created_at', 'desc')
            ->get();
            
        return response()->json($movements);
    }

    /**
     * Restock a product
     */
    public function restock(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'notes' => 'nullable|string',
        ]);

        try {
            DB::beginTransaction();

            $product = Product::findOrFail($request->product_id);
            
            // Update stock
            $product->stock += $request->quantity;
            $product->save();

            // Record movement
            DB::table('inventory_movements')->insert([
                'product_id' => $product->id,
                'type' => 'IN',
                'quantity' => $request->quantity,
                'notes' => $request->notes ?? 'Manual restock',
                'user_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Stok berhasil ditambahkan',
                'product' => $product
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal menambahkan stok: ' . $e->getMessage()
            ], 500);
        }
    }
}
