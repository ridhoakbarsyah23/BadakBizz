<?php

namespace Tests\Feature;

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
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

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
            ->assertJsonPath('0.variant_sku', 'SKU-BREAD-WHEAT');
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
