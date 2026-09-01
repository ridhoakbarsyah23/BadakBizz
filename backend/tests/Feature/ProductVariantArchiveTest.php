<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductVariantArchiveTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_product_archives_removed_variants_without_breaking_transaction_history(): void
    {
        Sanctum::actingAs($this->admin());

        $product = Product::create([
            'sku' => 'SKU-ARCHIVE',
            'name' => 'Archive Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $archivedVariant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Small',
            'sku' => 'SKU-ARCHIVE-S',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);

        $keptVariant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'SKU-ARCHIVE-L',
            'price_adjustment' => 5_000,
            'stock' => 3,
        ]);

        $transaction = Transaction::create([
            'transaction_number' => 'TRX-ARCHIVE-VARIANT',
            'subtotal' => 10_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 10_000,
            'payment_amount' => 10_000,
            'payment_method' => 'CASH',
            'status' => 'COMPLETED',
            'order_type' => 'takeaway',
        ]);

        $transactionItem = TransactionItem::create([
            'transaction_id' => $transaction->id,
            'product_id' => $product->id,
            'variant_id' => $archivedVariant->id,
            'quantity' => 1,
            'price' => 10_000,
            'subtotal' => 10_000,
        ]);

        $this->putJson("/api/products/{$product->id}", [
            'sku' => 'SKU-ARCHIVE',
            'name' => 'Archive Product Updated',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'id' => $keptVariant->id,
                    'name' => 'Large Updated',
                    'sku' => 'SKU-ARCHIVE-L',
                    'price_adjustment' => 6_000,
                    'stock' => 4,
                ],
                [
                    'name' => 'Medium',
                    'sku' => 'SKU-ARCHIVE-M',
                    'price_adjustment' => 3_000,
                    'stock' => 5,
                ],
            ],
        ])
            ->assertOk()
            ->assertJsonCount(2, 'variants')
            ->assertJsonMissing(['name' => 'Small'])
            ->assertJsonFragment(['name' => 'Large Updated'])
            ->assertJsonFragment(['name' => 'Medium']);

        $this->assertSoftDeleted('product_variants', ['id' => $archivedVariant->id]);
        $this->assertSame('Small', $transactionItem->fresh('variant')->variant->name);
        $this->assertSame(3, ProductVariant::withTrashed()->where('product_id', $product->id)->count());
        $this->assertSame(2, $product->fresh('variants')->variants->count());
    }

    public function test_disabling_variants_archives_existing_variants(): void
    {
        Sanctum::actingAs($this->admin());

        $product = Product::create([
            'sku' => 'SKU-DISABLE-VARIANTS',
            'name' => 'Disable Variants Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Only Variant',
            'sku' => 'SKU-DISABLE-VARIANTS-ONLY',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);

        $this->putJson("/api/products/{$product->id}", [
            'sku' => 'SKU-DISABLE-VARIANTS',
            'name' => 'Disable Variants Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => false,
            'stock' => 2,
            'minimum_stock' => 0,
            'variants' => [],
        ])->assertOk()
            ->assertJsonPath('has_variants', false)
            ->assertJsonCount(0, 'variants');

        $this->assertSoftDeleted('product_variants', ['id' => $variant->id]);
    }

    public function test_archived_variant_can_be_restored_by_sku_when_updating_same_product(): void
    {
        Sanctum::actingAs($this->admin());

        $product = Product::create([
            'sku' => 'SKU-RESTORE-VARIANT',
            'name' => 'Restore Variant Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Archived Size',
            'sku' => 'SKU-RESTORE-VARIANT-S',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);
        $variant->delete();

        $this->putJson("/api/products/{$product->id}", [
            'sku' => 'SKU-RESTORE-VARIANT',
            'name' => 'Restore Variant Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'name' => 'Restored Size',
                    'sku' => 'SKU-RESTORE-VARIANT-S',
                    'price_adjustment' => 1_000,
                    'stock' => 5,
                ],
            ],
        ])->assertOk()
            ->assertJsonCount(1, 'variants')
            ->assertJsonFragment(['name' => 'Restored Size']);

        $restoredVariant = $variant->fresh();
        $this->assertNull($restoredVariant->deleted_at);
        $this->assertSame('Restored Size', $restoredVariant->name);
        $this->assertSame(5, $restoredVariant->stock);
        $this->assertSame(1, ProductVariant::withTrashed()->where('product_id', $product->id)->count());
    }

    public function test_variant_sku_conflict_returns_validation_error_instead_of_database_error(): void
    {
        Sanctum::actingAs($this->admin());

        $firstProduct = Product::create([
            'sku' => 'SKU-CONFLICT-OWNER',
            'name' => 'Conflict Owner',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $firstProduct->id,
            'name' => 'Owner Variant',
            'sku' => 'SKU-VARIANT-CONFLICT',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);

        $this->postJson('/api/products', [
            'sku' => 'SKU-CONFLICT-NEW',
            'name' => 'Conflict New',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'name' => 'New Variant',
                    'sku' => 'SKU-VARIANT-CONFLICT',
                    'price_adjustment' => 0,
                    'stock' => 1,
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variants.0.sku');
    }

    public function test_multiple_variants_can_have_blank_sku_without_unique_database_conflict(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/products', [
            'sku' => 'SKU-BLANK-VARIANTS',
            'name' => 'Blank Variant SKU Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'name' => 'Small',
                    'sku' => '',
                    'price_adjustment' => 0,
                    'stock' => 2,
                ],
                [
                    'name' => 'Large',
                    'sku' => '',
                    'price_adjustment' => 2_000,
                    'stock' => 3,
                ],
            ],
        ])->assertCreated()
            ->assertJsonCount(2, 'variants')
            ->assertJsonPath('variants.0.sku', null)
            ->assertJsonPath('variants.1.sku', null);

        $this->assertDatabaseHas('product_variants', [
            'product_id' => $response->json('id'),
            'name' => 'Small',
            'sku' => null,
        ]);
        $this->assertDatabaseHas('product_variants', [
            'product_id' => $response->json('id'),
            'name' => 'Large',
            'sku' => null,
        ]);
    }

    public function test_product_and_variant_skus_are_normalized_before_storage(): void
    {
        Sanctum::actingAs($this->admin());

        $response = $this->postJson('/api/products', [
            'sku' => ' kopi gula 01 ',
            'name' => 'Normalized SKU Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'name' => 'Dingin',
                    'sku' => ' kopi gula 01 dingin ',
                    'price_adjustment' => 1_000,
                    'stock' => 2,
                ],
            ],
        ])->assertCreated()
            ->assertJsonPath('sku', 'KOPI-GULA-01')
            ->assertJsonPath('variants.0.sku', 'KOPI-GULA-01-DINGIN');

        $this->assertDatabaseHas('products', [
            'sku' => 'KOPI-GULA-01',
        ]);
        $this->assertDatabaseHas('product_variants', [
            'sku' => 'KOPI-GULA-01-DINGIN',
        ]);
    }

    public function test_product_sku_cannot_match_existing_variant_sku(): void
    {
        Sanctum::actingAs($this->admin());

        $product = Product::create([
            'sku' => 'SKU-PARENT',
            'name' => 'Parent Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Variant',
            'sku' => 'SKU-VARIANT-USED',
            'price_adjustment' => 0,
            'stock' => 2,
        ]);

        $this->postJson('/api/products', [
            'sku' => 'sku variant used',
            'name' => 'Conflicting Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 1,
            'minimum_stock' => 0,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('sku');
    }

    public function test_variant_sku_cannot_match_existing_product_sku(): void
    {
        Sanctum::actingAs($this->admin());

        Product::create([
            'sku' => 'SKU-PRODUCT-USED',
            'name' => 'Existing Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 1,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $this->postJson('/api/products', [
            'sku' => 'SKU-NEW-PARENT',
            'name' => 'Conflicting Variant Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'name' => 'Variant',
                    'sku' => 'sku product used',
                    'price_adjustment' => 0,
                    'stock' => 1,
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variants.0.sku');
    }

    public function test_variant_sku_cannot_match_its_product_sku(): void
    {
        Sanctum::actingAs($this->admin());

        $this->postJson('/api/products', [
            'sku' => 'SKU-SAME',
            'name' => 'Same SKU Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'variants' => [
                [
                    'name' => 'Variant',
                    'sku' => 'sku same',
                    'price_adjustment' => 0,
                    'stock' => 1,
                ],
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('variants.0.sku');
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
