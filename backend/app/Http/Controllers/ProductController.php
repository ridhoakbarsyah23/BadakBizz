<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with('category');
        
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sku' => 'required|string|unique:products',
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'purchase_price' => 'numeric|min:0',
            'selling_price' => 'numeric|min:0',
            'stock' => 'integer|min:0',
            'minimum_stock' => 'integer|min:0',
        ]);

        $product = Product::create($validated);
        $product->load('category');

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load('category'));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => 'string|unique:products,sku,' . $product->id,
            'name' => 'string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'purchase_price' => 'numeric|min:0',
            'selling_price' => 'numeric|min:0',
            'stock' => 'integer|min:0',
            'minimum_stock' => 'integer|min:0',
            'is_active' => 'boolean'
        ]);

        $product->update($validated);
        
        return response()->json($product->load('category'));
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(null, 204);
    }
}
