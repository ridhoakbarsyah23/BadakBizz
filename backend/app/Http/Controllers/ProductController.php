<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $query = Product::with(['category', 'variants']);

        if ($request->filled('search')) {
            $search = trim((string) $request->query('search'));
            $query->where(function ($query) use ($search) {
                $query->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%")
                    ->orWhereHas('variants', function ($query) use ($search) {
                        $query->where('name', 'like', "%{$search}%")
                            ->orWhere('sku', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->query('status') === 'active') {
            $query->where('is_active', true);
        } elseif ($request->query('status') === 'inactive') {
            $query->where('is_active', false);
        }

        if ($request->query('variant_type') === 'with_variants') {
            $query->where('has_variants', true);
        } elseif ($request->query('variant_type') === 'without_variants') {
            $query->where('has_variants', false);
        }

        if ($request->query('photo') === 'with_photo') {
            $query->whereNotNull('image_path');
        } elseif ($request->query('photo') === 'without_photo') {
            $query->whereNull('image_path');
        }

        if ($request->filled('stock_status')) {
            $this->applyStockFilter($query, (string) $request->query('stock_status'));
        }

        if ($request->has('per_page')) {
            return response()->json($query->paginate($request->per_page));
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $this->normalizeSkuInputs($request);

        $validated = $request->validate([
            'sku' => 'required|string|regex:/^[A-Z0-9-]+$/|unique:products',
            'barcode' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
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
            'variants.*.sku' => 'nullable|string|regex:/^[A-Z0-9-]+$/',
            'variants.*.price_adjustment' => 'numeric',
            'variants.*.stock' => 'integer|min:0',
            'variants_present' => 'boolean',
        ]);

        $this->validateProductSku($validated['sku']);
        $this->validateVariantSkus($validated['variants'] ?? [], productSku: $validated['sku']);

        $productData = Arr::except($validated, ['variants', 'variants_present', 'image']);

        if ($request->hasFile('image')) {
            $productData['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product = Product::create($productData);

        if (($request->has('variants') || $request->boolean('variants_present')) && $request->has_variants) {
            foreach ($validated['variants'] ?? [] as $variant) {
                $product->variants()->create($this->variantPayload($variant));
            }
        }

        $product->load(['category', 'variants']);

        return response()->json($product, 201);
    }

    public function show(Product $product)
    {
        return response()->json($product->load(['category', 'variants']));
    }

    public function nextSku(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'product_id' => 'nullable|exists:products,id',
        ]);

        $category = isset($validated['category_id'])
            ? Category::find($validated['category_id'])
            : null;
        $categoryCode = $this->categorySkuCode($category?->name ?? 'Produk');
        $nameCode = $this->productNameSkuCode($validated['name']);
        $prefix = "{$categoryCode}-{$nameCode}";
        $ignoreProduct = isset($validated['product_id'])
            ? Product::find($validated['product_id'])
            : null;
        $sequence = $this->nextSkuSequence($prefix, $ignoreProduct);

        return response()->json([
            'sku' => $this->skuWithSequence($prefix, $sequence),
            'prefix' => $prefix,
            'sequence' => $sequence,
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $this->normalizeSkuInputs($request);

        $validated = $request->validate([
            'sku' => 'string|regex:/^[A-Z0-9-]+$/|unique:products,sku,'.$product->id,
            'barcode' => 'nullable|string',
            'image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'remove_image' => 'boolean',
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
            'variants.*.id' => 'nullable|integer',
            'variants.*.name' => 'required_with:variants|string',
            'variants.*.sku' => 'nullable|string|regex:/^[A-Z0-9-]+$/',
            'variants.*.price_adjustment' => 'numeric',
            'variants.*.stock' => 'integer|min:0',
            'variants_present' => 'boolean',
        ]);

        if (isset($validated['sku'])) {
            $this->validateProductSku($validated['sku'], $product);
        }

        $this->validateVariantSkus($validated['variants'] ?? [], $product, $validated['sku'] ?? $product->sku);

        $productData = Arr::except($validated, ['variants', 'variants_present', 'image', 'remove_image']);

        if ($request->boolean('remove_image') && $product->image_path) {
            Storage::disk('public')->delete($product->image_path);
            $productData['image_path'] = null;
        }

        if ($request->hasFile('image')) {
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }

            $productData['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product->update($productData);

        if (($request->has('variants') || $request->boolean('variants_present')) && $request->has_variants) {
            $keptVariantIds = [];

            foreach ($validated['variants'] ?? [] as $variantData) {
                $variantPayload = $this->variantPayload($variantData);
                $variantId = $variantData['id'] ?? null;

                if ($variantId) {
                    $variant = ProductVariant::withTrashed()
                        ->where('product_id', $product->id)
                        ->find($variantId);

                    if (! $variant) {
                        throw ValidationException::withMessages([
                            'variants' => 'Variant not found for this product.',
                        ]);
                    }

                    $variant->fill($variantPayload);
                    $variant->restore();
                    $variant->save();
                } else {
                    $variant = null;

                    if (! empty($variantPayload['sku'])) {
                        $variant = ProductVariant::withTrashed()
                            ->where('product_id', $product->id)
                            ->where('sku', $variantPayload['sku'])
                            ->first();
                    }

                    if ($variant) {
                        $variant->fill($variantPayload);
                        $variant->restore();
                        $variant->save();
                    } else {
                        $variant = $product->variants()->create($variantPayload);
                    }
                }

                $keptVariantIds[] = $variant->id;
            }

            if (count($keptVariantIds) > 0) {
                $product->variants()->whereNotIn('id', $keptVariantIds)->delete();
            } else {
                $product->variants()->delete();
            }
        } elseif (isset($validated['has_variants']) && ! $validated['has_variants']) {
            $product->variants()->delete();
        }

        return response()->json($product->load(['category', 'variants']));
    }

    private function applyStockFilter($query, string $stockStatus): void
    {
        $variantStockSum = '(select coalesce(sum(stock), 0) from product_variants where product_variants.product_id = products.id and product_variants.deleted_at is null)';

        if ($stockStatus === 'out') {
            $query->where(function ($query) use ($variantStockSum) {
                $query->where(function ($query) {
                    $query->where('has_variants', false)
                        ->where('stock', '<=', 0);
                })->orWhere(function ($query) use ($variantStockSum) {
                    $query->where('has_variants', true)
                        ->whereRaw("{$variantStockSum} <= 0");
                });
            });
        } elseif ($stockStatus === 'low') {
            $query->where(function ($query) use ($variantStockSum) {
                $query->where(function ($query) {
                    $query->where('has_variants', false)
                        ->whereColumn('stock', '<=', 'minimum_stock')
                        ->where('stock', '>', 0);
                })->orWhere(function ($query) use ($variantStockSum) {
                    $query->where('has_variants', true)
                        ->whereRaw("{$variantStockSum} <= products.minimum_stock")
                        ->whereRaw("{$variantStockSum} > 0");
                });
            });
        } elseif ($stockStatus === 'safe') {
            $query->where(function ($query) use ($variantStockSum) {
                $query->where(function ($query) {
                    $query->where('has_variants', false)
                        ->whereColumn('stock', '>', 'minimum_stock');
                })->orWhere(function ($query) use ($variantStockSum) {
                    $query->where('has_variants', true)
                        ->whereRaw("{$variantStockSum} > products.minimum_stock");
                });
            });
        }
    }

    private function variantPayload(array $variantData): array
    {
        $payload = Arr::only($variantData, ['name', 'sku', 'price_adjustment', 'stock']);

        if (array_key_exists('sku', $payload)) {
            $payload['sku'] = $this->normalizeSku($payload['sku']);
        }

        if (array_key_exists('sku', $payload) && $payload['sku'] === '') {
            $payload['sku'] = null;
        }

        return $payload;
    }

    private function normalizeSkuInputs(Request $request): void
    {
        $normalized = [];

        if ($request->has('sku')) {
            $normalized['sku'] = $this->normalizeSku($request->input('sku'));
        }

        if ($request->has('variants')) {
            $normalized['variants'] = collect($request->input('variants', []))
                ->map(function ($variant): array {
                    if (! is_array($variant)) {
                        return [];
                    }

                    if (array_key_exists('sku', $variant)) {
                        $variant['sku'] = $this->normalizeSku($variant['sku']);
                    }

                    return $variant;
                })
                ->all();
        }

        if ($normalized !== []) {
            $request->merge($normalized);
        }
    }

    private function normalizeSku(mixed $sku): string
    {
        $sku = strtoupper(trim((string) $sku));
        $sku = preg_replace('/[^A-Z0-9]+/', '-', $sku) ?? '';

        return trim($sku, '-');
    }

    private function categorySkuCode(string $categoryName): string
    {
        $categoryCode = str_replace('-', '', $this->normalizeSku($categoryName));

        return substr($categoryCode ?: 'PRD', 0, 3);
    }

    private function productNameSkuCode(string $productName): string
    {
        $nameCode = str_replace('-', '', $this->normalizeSku($productName));

        return $nameCode ?: 'ITEM';
    }

    private function nextSkuSequence(string $prefix, ?Product $ignoreProduct = null): int
    {
        $skus = Product::where('sku', 'like', "{$prefix}-%")
            ->when($ignoreProduct, fn ($query) => $query->where('id', '!=', $ignoreProduct->id))
            ->pluck('sku')
            ->merge(
                ProductVariant::withTrashed()
                    ->where('sku', 'like', "{$prefix}-%")
                    ->pluck('sku')
            );

        $maxSequence = 0;
        $pattern = '/^'.preg_quote($prefix, '/').'-(\d+)$/';

        foreach ($skus as $sku) {
            if (preg_match($pattern, (string) $sku, $matches)) {
                $maxSequence = max($maxSequence, (int) $matches[1]);
            }
        }

        $sequence = $maxSequence + 1;

        while ($this->skuExists($this->skuWithSequence($prefix, $sequence), $ignoreProduct)) {
            $sequence++;
        }

        return $sequence;
    }

    private function skuWithSequence(string $prefix, int $sequence): string
    {
        return $prefix.'-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT);
    }

    private function skuExists(string $sku, ?Product $ignoreProduct = null): bool
    {
        $existingProduct = Product::where('sku', $sku)
            ->when($ignoreProduct, fn ($query) => $query->where('id', '!=', $ignoreProduct->id))
            ->exists();

        return $existingProduct || ProductVariant::withTrashed()->where('sku', $sku)->exists();
    }

    private function validateProductSku(string $sku, ?Product $product = null): void
    {
        $existingProduct = Product::where('sku', $sku)
            ->when($product, fn ($query) => $query->where('id', '!=', $product->id))
            ->exists();

        if ($existingProduct) {
            throw ValidationException::withMessages([
                'sku' => 'Product SKU is already in use.',
            ]);
        }

        $existingVariant = ProductVariant::withTrashed()
            ->where('sku', $sku)
            ->exists();

        if ($existingVariant) {
            throw ValidationException::withMessages([
                'sku' => 'Product SKU cannot match a variant SKU.',
            ]);
        }
    }

    private function validateVariantSkus(array $variants, ?Product $product = null, ?string $productSku = null): void
    {
        $seenSkus = [];
        $productSku = $productSku ? $this->normalizeSku($productSku) : null;

        foreach ($variants as $index => $variantData) {
            $sku = $this->normalizeSku($variantData['sku'] ?? '');

            if ($sku === '') {
                continue;
            }

            if ($productSku && $sku === $productSku) {
                throw ValidationException::withMessages([
                    "variants.$index.sku" => 'Variant SKU cannot match the product SKU.',
                ]);
            }

            if (isset($seenSkus[$sku])) {
                throw ValidationException::withMessages([
                    "variants.$index.sku" => 'Variant SKU must be unique.',
                ]);
            }

            $seenSkus[$sku] = true;

            $existingProduct = Product::where('sku', $sku)
                ->when($product, fn ($query) => $query->where('id', '!=', $product->id))
                ->exists();

            if ($existingProduct) {
                throw ValidationException::withMessages([
                    "variants.$index.sku" => 'Variant SKU cannot match a product SKU.',
                ]);
            }

            $variantId = $variantData['id'] ?? null;
            $existingVariant = ProductVariant::withTrashed()
                ->where('sku', $sku)
                ->first();

            if (! $existingVariant) {
                continue;
            }

            if ($variantId && (int) $existingVariant->id === (int) $variantId) {
                continue;
            }

            if ($product && (int) $existingVariant->product_id === (int) $product->id && $existingVariant->trashed()) {
                continue;
            }

            throw ValidationException::withMessages([
                "variants.$index.sku" => 'Variant SKU is already in use.',
            ]);
        }
    }

    public function destroy(Product $product)
    {
        if ($product->image_path) {
            Storage::disk('public')->delete($product->image_path);
        }

        $product->delete();

        return response()->json(null, 204);
    }
}
