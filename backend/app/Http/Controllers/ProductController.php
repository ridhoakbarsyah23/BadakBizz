<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'variants']);
        
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        
        if ($request->has('per_page')) {
            return response()->json($query->paginate($request->per_page));
        }
        
        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sku' => 'required|string|unique:products',
            'barcode' => 'nullable|string',
            'name' => 'required|string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'purchase_price' => 'numeric|min:0',
            'selling_price' => 'numeric|min:0',
            'unit' => 'nullable|string',
            'has_variants' => 'boolean',
            'stock' => 'integer|min:0',
            'minimum_stock' => 'integer|min:0',
            'variants' => 'nullable|array',
            'variants.*.name' => 'required_with:variants|string',
            'variants.*.sku' => 'nullable|string',
            'variants.*.price_adjustment' => 'numeric',
            'variants.*.stock' => 'integer|min:0',
        ]);

        $product = Product::create(\Illuminate\Support\Arr::except($validated, ['variants']));

        if ($request->has('variants') && $request->has_variants) {
            foreach ($request->variants as $variant) {
                $product->variants()->create($variant);
            }
        }

        $product->load(['category', 'variants']);

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load(['category', 'variants']));
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'sku' => 'string|unique:products,sku,' . $product->id,
            'barcode' => 'nullable|string',
            'name' => 'string|max:255',
            'category_id' => 'nullable|exists:categories,id',
            'purchase_price' => 'numeric|min:0',
            'selling_price' => 'numeric|min:0',
            'unit' => 'nullable|string',
            'has_variants' => 'boolean',
            'stock' => 'integer|min:0',
            'minimum_stock' => 'integer|min:0',
            'is_active' => 'boolean',
            'variants' => 'nullable|array',
        ]);

        $product->update(\Illuminate\Support\Arr::except($validated, ['variants']));

        if ($request->has('variants') && $request->has_variants) {
            // Very simple approach: delete old variants and create new ones
            $product->variants()->delete();
            foreach ($request->variants as $variant) {
                $product->variants()->create($variant);
            }
        } else if (isset($validated['has_variants']) && !$validated['has_variants']) {
            $product->variants()->delete();
        }
        
        return response()->json($product->load(['category', 'variants']));
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return response()->json(null, 204);
    }
}
