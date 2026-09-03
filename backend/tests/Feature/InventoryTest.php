<?php

namespace Tests\Feature;

use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_restock_product_variant_and_record_variant_movement(): void
    {
        $admin = $this->userWithRole('admin', 'Administrator');
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-MILK',
            'name' => 'Milk',
            'purchase_price' => 8_000,
            'selling_price' => 12_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Cold',
            'sku' => 'SKU-MILK-COLD',
            'price_adjustment' => 1_000,
            'stock' => 3,
        ]);

        $this->postJson('/api/inventory/restock', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 5,
            'notes' => 'Supplier refill',
        ])->assertOk()
            ->assertJsonPath('product.variants.0.stock', 8);

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(8, $variant->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'type' => 'IN',
            'quantity' => 5,
            'notes' => 'Supplier refill',
            'user_id' => $admin->id,
        ]);
    }

    public function test_restock_requires_variant_for_product_with_variants(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        $product = Product::create([
            'sku' => 'SKU-SODA',
            'name' => 'Soda',
            'purchase_price' => 5_000,
            'selling_price' => 9_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $this->postJson('/api/inventory/restock', [
            'product_id' => $product->id,
            'quantity' => 2,
        ])->assertStatus(400)
            ->assertJsonPath('message', 'Gagal menambahkan stok: Variant is required for this product.');

        $this->assertDatabaseCount('inventory_movements', 0);
    }

    public function test_inventory_movements_include_variant_metadata(): void
    {
        $admin = $this->userWithRole('admin', 'Administrator');
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-BREAD',
            'name' => 'Bread',
            'purchase_price' => 4_000,
            'selling_price' => 7_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Wheat',
            'sku' => 'SKU-BREAD-WHEAT',
            'price_adjustment' => 500,
            'stock' => 1,
        ]);

        $this->postJson('/api/inventory/restock', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 3,
        ])->assertOk();

        $this->getJson('/api/inventory/movements')
            ->assertOk()
            ->assertJsonPath('0.product_name', 'Bread')
            ->assertJsonPath('0.variant_name', 'Wheat')
            ->assertJsonPath('0.variant_sku', 'SKU-BREAD-WHEAT')
            ->assertJsonPath('0.user_name', $admin->name);
    }

    public function test_inventory_movements_can_be_filtered_by_type_product_variant_user_and_date(): void
    {
        $admin = $this->userWithRole('admin', 'Administrator');
        Sanctum::actingAs($admin);

        $coffee = Product::create([
            'sku' => 'SKU-FILTER-COFFEE',
            'name' => 'Filter Coffee',
            'purchase_price' => 8_000,
            'selling_price' => 14_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $hot = ProductVariant::create([
            'product_id' => $coffee->id,
            'name' => 'Hot',
            'sku' => 'SKU-FILTER-COFFEE-HOT',
            'price_adjustment' => 0,
            'stock' => 5,
        ]);

        $tea = Product::create([
            'sku' => 'SKU-FILTER-TEA',
            'name' => 'Filter Tea',
            'purchase_price' => 5_000,
            'selling_price' => 9_000,
            'stock' => 4,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        InventoryMovement::create([
            'product_id' => $tea->id,
            'type' => 'IN',
            'quantity' => 3,
            'notes' => 'Older supplier stock',
            'user_id' => $admin->id,
            'created_at' => now()->subDays(2),
            'updated_at' => now()->subDays(2),
        ]);

        $targetMovement = InventoryMovement::create([
            'product_id' => $coffee->id,
            'variant_id' => $hot->id,
            'type' => 'ADJUSTMENT',
            'quantity' => -2,
            'notes' => 'Stock opname morning',
            'user_id' => $admin->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $response = $this->getJson('/api/inventory/movements?type=ADJUSTMENT&product_id='.$coffee->id.'&variant_id='.$hot->id.'&user_id='.$admin->id.'&start_date='.now()->toDateString().'&end_date='.now()->toDateString());

        $response->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $targetMovement->id)
            ->assertJsonPath('0.product_name', 'Filter Coffee')
            ->assertJsonPath('0.variant_name', 'Hot')
            ->assertJsonPath('0.user_name', $admin->name);
    }

    public function test_inventory_movements_can_be_searched_and_paginated(): void
    {
        $admin = $this->userWithRole('admin', 'Administrator');
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-SEARCH-BEANS',
            'name' => 'Searchable Beans',
            'purchase_price' => 10_000,
            'selling_price' => 18_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Arabica',
            'sku' => 'SKU-SEARCH-BEANS-ARABICA',
            'price_adjustment' => 2_000,
            'stock' => 6,
        ]);

        InventoryMovement::create([
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'type' => 'IN',
            'quantity' => 4,
            'notes' => 'Roastery delivery',
            'user_id' => $admin->id,
        ]);

        InventoryMovement::create([
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'type' => 'ADJUSTMENT',
            'quantity' => -1,
            'notes' => 'Manual correction',
            'user_id' => $admin->id,
        ]);

        $this->getJson('/api/inventory/movements?search=roastery&per_page=1')
            ->assertOk()
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.notes', 'Roastery delivery')
            ->assertJsonPath('data.0.variant_sku', 'SKU-SEARCH-BEANS-ARABICA');
    }

    public function test_admin_can_adjust_product_stock_and_record_signed_movement(): void
    {
        $admin = $this->userWithRole('admin', 'Administrator');
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-ADJUST',
            'name' => 'Adjusted Product',
            'purchase_price' => 4_000,
            'selling_price' => 7_000,
            'stock' => 10,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $this->postJson('/api/inventory/adjust', [
            'product_id' => $product->id,
            'actual_stock' => 6,
            'reason' => 'Stock opname',
        ])->assertOk()
            ->assertJsonPath('product.stock', 6);

        $this->assertSame(6, $product->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'variant_id' => null,
            'type' => 'ADJUSTMENT',
            'quantity' => -4,
            'notes' => 'Stock adjustment: Stock opname (10 -> 6)',
            'user_id' => $admin->id,
        ]);
    }

    public function test_admin_can_adjust_variant_stock(): void
    {
        $admin = $this->userWithRole('admin', 'Administrator');
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-VARIANT-ADJUST',
            'name' => 'Variant Adjusted Product',
            'purchase_price' => 4_000,
            'selling_price' => 7_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'SKU-VARIANT-ADJUST-L',
            'price_adjustment' => 1_000,
            'stock' => 2,
        ]);

        $this->postJson('/api/inventory/adjust', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'actual_stock' => 5,
            'reason' => 'Found extra stock',
        ])->assertOk()
            ->assertJsonPath('product.variants.0.stock', 5);

        $this->assertSame(5, $variant->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'type' => 'ADJUSTMENT',
            'quantity' => 3,
            'notes' => 'Stock adjustment: Found extra stock (2 -> 5)',
            'user_id' => $admin->id,
        ]);
    }

    public function test_adjustment_requires_reason_and_actual_stock_difference(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        $product = Product::create([
            'sku' => 'SKU-NO-DIFF',
            'name' => 'No Difference Product',
            'purchase_price' => 4_000,
            'selling_price' => 7_000,
            'stock' => 10,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $this->postJson('/api/inventory/adjust', [
            'product_id' => $product->id,
            'actual_stock' => 10,
            'reason' => 'Stock opname',
        ])->assertStatus(400)
            ->assertJsonPath('message', 'Gagal menyesuaikan stok: Stock is already equal to the actual count.');

        $this->postJson('/api/inventory/adjust', [
            'product_id' => $product->id,
            'actual_stock' => 9,
        ])->assertStatus(422);

        $this->assertSame(10, $product->fresh()->stock);
        $this->assertDatabaseCount('inventory_movements', 0);
    }

    private function userWithRole(string $slug, string $name): User
    {
        $role = Role::create([
            'slug' => $slug,
            'name' => $name,
        ]);

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }
}
