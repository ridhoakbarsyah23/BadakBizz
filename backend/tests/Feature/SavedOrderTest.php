<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SavedOrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_can_save_update_and_delete_an_order_without_changing_stock_or_table(): void
    {
        $cashier = $this->cashier();
        Sanctum::actingAs($cashier);

        $table = Table::create(['name' => 'A1', 'status' => 'available']);
        $product = $this->product();

        $created = $this->postJson('/api/saved-orders', [
            'name' => 'Makan siang A1',
            'order_type' => 'dine_in',
            'table_id' => $table->id,
            'custom_discount_percent' => 10,
            'notes' => 'Tunggu teman datang',
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                    'notes' => 'Tanpa gula',
                ],
            ],
        ]);

        $orderId = $created->assertCreated()
            ->assertJsonPath('name', 'Makan siang A1')
            ->assertJsonPath('item_count', 2)
            ->assertJsonPath('items.0.current_price', 10_000)
            ->assertJsonPath('items.0.is_available', true)
            ->json('id');

        $this->assertSame(10, $product->fresh()->stock);
        $this->assertSame('available', $table->fresh()->status);
        $this->assertDatabaseCount('transactions', 0);
        $this->assertDatabaseCount('inventory_movements', 0);

        $this->putJson("/api/saved-orders/{$orderId}", [
            'name' => 'Makan siang diperbarui',
            'order_type' => 'takeaway',
            'table_id' => $table->id,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
        ])->assertOk()
            ->assertJsonPath('name', 'Makan siang diperbarui')
            ->assertJsonPath('table_id', null)
            ->assertJsonPath('item_count', 1);

        $this->deleteJson("/api/saved-orders/{$orderId}")->assertNoContent();
        $this->assertDatabaseCount('saved_orders', 0);
        $this->assertDatabaseCount('saved_order_items', 0);
    }

    public function test_saved_orders_are_private_to_the_cashier(): void
    {
        $role = Role::create(['slug' => 'cashier', 'name' => 'Cashier']);
        $owner = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $otherCashier = User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
        $product = $this->product();

        Sanctum::actingAs($owner);
        $orderId = $this->postJson('/api/saved-orders', [
            'name' => 'Draft pribadi',
            'order_type' => 'takeaway',
            'items' => [['product_id' => $product->id, 'quantity' => 1]],
        ])->assertCreated()->json('id');

        Sanctum::actingAs($otherCashier);
        $this->getJson('/api/saved-orders')->assertOk()->assertJsonCount(0);
        $this->getJson("/api/saved-orders/{$orderId}")->assertNotFound();
        $this->deleteJson("/api/saved-orders/{$orderId}")->assertNotFound();

        $this->assertDatabaseHas('saved_orders', ['id' => $orderId, 'user_id' => $owner->id]);
    }

    public function test_reopening_a_saved_order_reports_current_price_and_stock(): void
    {
        Sanctum::actingAs($this->cashier());
        $product = $this->product();

        $orderId = $this->postJson('/api/saved-orders', [
            'name' => 'Draft harga lama',
            'order_type' => 'takeaway',
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
        ])->assertCreated()->json('id');

        $product->update(['selling_price' => 12_000, 'stock' => 1]);

        $this->getJson("/api/saved-orders/{$orderId}")
            ->assertOk()
            ->assertJsonPath('items.0.unit_price', 10_000)
            ->assertJsonPath('items.0.current_price', 12_000)
            ->assertJsonPath('items.0.current_stock', 1)
            ->assertJsonPath('items.0.price_changed', true);

        $this->postJson('/api/transactions', [
            'items' => [['product_id' => $product->id, 'quantity' => 2]],
            'payment_method' => 'CASH',
            'payment_amount' => 30_000,
            'order_type' => 'takeaway',
        ])->assertStatus(400)
            ->assertJsonPath('error', 'Insufficient stock for product: Coffee');

        $this->assertDatabaseCount('transactions', 0);
        $this->assertSame(1, $product->fresh()->stock);
    }

    public function test_saved_order_validates_variant_ownership(): void
    {
        Sanctum::actingAs($this->cashier());

        $product = $this->product(['sku' => 'SKU-VARIANT', 'name' => 'Tea', 'has_variants' => true, 'stock' => 0]);
        $otherProduct = $this->product(['sku' => 'SKU-OTHER', 'name' => 'Other']);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'SKU-VARIANT-L',
            'price_adjustment' => 2_000,
            'stock' => 5,
        ]);

        $this->postJson('/api/saved-orders', [
            'name' => 'Varian salah',
            'order_type' => 'takeaway',
            'items' => [[
                'product_id' => $otherProduct->id,
                'variant_id' => $variant->id,
                'quantity' => 1,
            ]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.variant_id');

        $this->assertDatabaseCount('saved_orders', 0);
    }

    private function cashier(): User
    {
        $role = Role::create(['slug' => 'cashier', 'name' => 'Cashier']);

        return User::factory()->create(['role_id' => $role->id, 'is_active' => true]);
    }

    private function product(array $attributes = []): Product
    {
        return Product::create(array_merge([
            'sku' => 'SKU-COFFEE',
            'name' => 'Coffee',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 2,
            'is_active' => true,
        ], $attributes));
    }
}
