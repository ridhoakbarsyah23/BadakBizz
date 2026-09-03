<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductChangeLog;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductChangeLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_product_update_records_changed_price_minimum_stock_and_status(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-LOG-PRODUCT',
            'name' => 'Logged Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 8,
            'minimum_stock' => 2,
            'is_active' => true,
        ]);

        $this->putJson("/api/products/{$product->id}", [
            'sku' => 'SKU-LOG-PRODUCT',
            'name' => 'Logged Product',
            'purchase_price' => 6_000,
            'selling_price' => 12_500,
            'stock' => 8,
            'minimum_stock' => 4,
            'is_active' => false,
        ])->assertOk();

        $log = ProductChangeLog::first();

        $this->assertNotNull($log);
        $this->assertSame($product->id, $log->product_id);
        $this->assertNull($log->product_variant_id);
        $this->assertSame($admin->id, $log->user_id);
        $this->assertSame('product', $log->entity_type);
        $this->assertSame('updated', $log->action);
        $this->assertSame(5000, $log->changes['purchase_price']['old']);
        $this->assertSame(6000, $log->changes['purchase_price']['new']);
        $this->assertSame(10000, $log->changes['selling_price']['old']);
        $this->assertSame(12500, $log->changes['selling_price']['new']);
        $this->assertSame(2, $log->changes['minimum_stock']['old']);
        $this->assertSame(4, $log->changes['minimum_stock']['new']);
        $this->assertTrue($log->changes['is_active']['old']);
        $this->assertFalse($log->changes['is_active']['new']);
    }

    public function test_product_change_logs_endpoint_returns_variant_and_user_metadata(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-LOG-ENDPOINT',
            'name' => 'Logged Endpoint Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Small',
            'sku' => 'SKU-LOG-ENDPOINT-S',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);

        ProductChangeLog::create([
            'product_id' => $product->id,
            'product_variant_id' => $variant->id,
            'user_id' => $admin->id,
            'entity_type' => 'variant',
            'action' => 'updated',
            'changes' => [
                'price_adjustment' => ['old' => '0.00', 'new' => 1000],
            ],
        ]);

        $this->getJson("/api/products/{$product->id}/change-logs?per_page=10")
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.entity_type', 'variant')
            ->assertJsonPath('data.0.action', 'updated')
            ->assertJsonPath('data.0.variant.name', 'Small')
            ->assertJsonPath('data.0.user.name', $admin->name);
    }

    public function test_variant_update_records_update_create_and_archive_logs(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-LOG-VARIANTS',
            'name' => 'Logged Variants Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $small = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Small',
            'sku' => 'SKU-LOG-VARIANTS-S',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);

        $large = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'SKU-LOG-VARIANTS-L',
            'price_adjustment' => 5_000,
            'stock' => 3,
        ]);

        $this->putJson("/api/products/{$product->id}", [
            'sku' => 'SKU-LOG-VARIANTS',
            'name' => 'Logged Variants Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'id' => $large->id,
                    'name' => 'Large Updated',
                    'sku' => 'SKU-LOG-VARIANTS-L',
                    'price_adjustment' => 6_000,
                    'stock' => 4,
                ],
                [
                    'name' => 'Medium',
                    'sku' => 'SKU-LOG-VARIANTS-M',
                    'price_adjustment' => 3_000,
                    'stock' => 5,
                ],
            ],
        ])->assertOk();

        $this->assertDatabaseHas('product_change_logs', [
            'product_id' => $product->id,
            'product_variant_id' => $large->id,
            'entity_type' => 'variant',
            'action' => 'updated',
            'user_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('product_change_logs', [
            'product_id' => $product->id,
            'entity_type' => 'variant',
            'action' => 'created',
            'user_id' => $admin->id,
        ]);
        $this->assertDatabaseHas('product_change_logs', [
            'product_id' => $product->id,
            'product_variant_id' => $small->id,
            'entity_type' => 'variant',
            'action' => 'archived',
            'user_id' => $admin->id,
        ]);

        $updatedLog = ProductChangeLog::where('product_variant_id', $large->id)
            ->where('action', 'updated')
            ->firstOrFail();

        $this->assertSame('Large', $updatedLog->changes['name']['old']);
        $this->assertSame('Large Updated', $updatedLog->changes['name']['new']);
        $this->assertSame(5000, $updatedLog->changes['price_adjustment']['old']);
        $this->assertSame(6000, $updatedLog->changes['price_adjustment']['new']);
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
