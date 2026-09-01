<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductFilterTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_index_can_search_product_and_variant_identity(): void
    {
        Sanctum::actingAs($this->admin());

        $coffee = Product::create([
            'sku' => 'KOP-GA',
            'barcode' => '89910001',
            'name' => 'Kopi Gula Aren',
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $coffee->id,
            'name' => 'Dingin',
            'sku' => 'KOP-GA-ICE',
            'price_adjustment' => 2_000,
            'stock' => 5,
        ]);

        Product::create([
            'sku' => 'TEH-HOT',
            'name' => 'Teh Panas',
            'purchase_price' => 3_000,
            'selling_price' => 8_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $this->getJson('/api/products?search=KOP-GA-ICE&per_page=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Kopi Gula Aren');
    }

    public function test_product_index_can_filter_by_category_status_photo_and_variant_type(): void
    {
        Sanctum::actingAs($this->admin());

        $drink = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);
        $food = Category::create(['name' => 'Makanan', 'slug' => 'makanan']);

        Product::create([
            'sku' => 'DRINK-PHOTO',
            'name' => 'Drink With Photo',
            'category_id' => $drink->id,
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 1,
            'is_active' => true,
            'image_path' => 'products/drink.jpg',
        ]);

        Product::create([
            'sku' => 'FOOD-NO-PHOTO',
            'name' => 'Food Without Photo',
            'category_id' => $food->id,
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'has_variants' => false,
            'stock' => 10,
            'minimum_stock' => 1,
            'is_active' => false,
        ]);

        $this->getJson("/api/products?category_id={$drink->id}&status=active&photo=with_photo&variant_type=with_variants&per_page=10")
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sku', 'DRINK-PHOTO');
    }

    public function test_product_index_can_filter_stock_status_for_regular_and_variant_products(): void
    {
        Sanctum::actingAs($this->admin());

        Product::create([
            'sku' => 'STOCK-LOW',
            'name' => 'Low Stock Product',
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'stock' => 2,
            'minimum_stock' => 3,
            'is_active' => true,
        ]);

        Product::create([
            'sku' => 'STOCK-SAFE',
            'name' => 'Safe Stock Product',
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'stock' => 6,
            'minimum_stock' => 3,
            'is_active' => true,
        ]);

        $variantProduct = Product::create([
            'sku' => 'STOCK-VARIANT-OUT',
            'name' => 'Out Variant Product',
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $variantProduct->id,
            'name' => 'Kosong',
            'sku' => 'STOCK-VARIANT-OUT-KOSONG',
            'price_adjustment' => 0,
            'stock' => 0,
        ]);

        $this->getJson('/api/products?stock_status=low&per_page=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sku', 'STOCK-LOW');

        $this->getJson('/api/products?stock_status=out&per_page=10')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.sku', 'STOCK-VARIANT-OUT');
    }

    public function test_admin_can_generate_next_sku_from_category_name_and_sequence(): void
    {
        Sanctum::actingAs($this->admin());

        $category = Category::create(['name' => 'Minuman', 'slug' => 'minuman']);

        Product::create([
            'sku' => 'MIN-KOPIGULAAREN-001',
            'name' => 'Kopi Gula Aren',
            'category_id' => $category->id,
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        Product::create([
            'sku' => 'MIN-KOPIGULAAREN-002',
            'name' => 'Kopi Gula Aren',
            'category_id' => $category->id,
            'purchase_price' => 5_000,
            'selling_price' => 15_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $this->getJson("/api/products/next-sku?category_id={$category->id}&name=Kopi%20Gula%20Aren")
            ->assertOk()
            ->assertJsonPath('prefix', 'MIN-KOPIGULAAREN')
            ->assertJsonPath('sequence', 3)
            ->assertJsonPath('sku', 'MIN-KOPIGULAAREN-003');
    }

    private function admin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin']
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }
}
