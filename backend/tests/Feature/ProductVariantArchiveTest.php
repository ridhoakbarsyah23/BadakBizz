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
