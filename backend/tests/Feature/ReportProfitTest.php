<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\User;
use App\Services\TransactionStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ReportProfitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(now()->setDate(2026, 9, 7)->setTime(10, 0));
        $role = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'Admin']);
        Sanctum::actingAs(User::factory()->create(['role_id' => $role->id]));
        Store::create([
            'name' => 'Profit Test', 'tax_rate' => 0, 'service_charge_rate' => 0,
            'enable_shift_management' => false,
        ]);
    }

    public function test_cash_checkout_preserves_cost_after_price_changes_and_product_deletion(): void
    {
        $product = $this->product();
        $transaction = $this->checkout($product);
        $this->assertSame('5000.00', $transaction->items->first()->purchase_price);
        $this->assertProfit(10000);

        $product->update(['purchase_price' => 9000, 'selling_price' => 15000]);
        $this->assertProfit(10000);
        $product->delete();
        $this->assertProfit(10000);
    }

    public function test_qris_variant_keeps_original_cost_through_completion_and_void(): void
    {
        $product = $this->product();
        $product->update(['has_variants' => true]);
        $variant = ProductVariant::create([
            'product_id' => $product->id, 'name' => 'Large',
            'price_adjustment' => 2000, 'stock' => 10,
        ]);
        $transaction = $this->checkout($product, 'QRIS', $variant->id);
        $this->assertProfit(0);
        $product->update(['purchase_price' => 9000]);
        app(TransactionStatusService::class)->complete($transaction);
        $this->assertProfit(14000);
        $this->assertSame('5000.00', $transaction->items()->first()->purchase_price);

        $this->postJson('/api/transactions/'.$transaction->id.'/void')->assertOk();
        $this->assertProfit(0);
    }

    public function test_zero_cost_is_not_replaced_by_current_product_cost(): void
    {
        $product = $this->product();
        $product->update(['purchase_price' => 0]);
        $this->checkout($product);
        $product->update(['purchase_price' => 9000]);
        $this->assertProfit(20000);
    }

    public function test_legacy_items_use_explicitly_flagged_estimates_only_within_completed_period(): void
    {
        $product = $this->product();
        $transaction = $this->checkout($product);
        $transaction->items()->update(['purchase_price' => null]);
        $product->update(['purchase_price' => 6000]);
        $this->assertProfit(8000, 1);

        $pending = $this->checkout($product, 'QRIS');
        $pending->items()->update(['purchase_price' => null]);
        $this->assertProfit(8000, 1);
        $this->getJson('/api/reports?start_date=2026-09-08&end_date=2026-09-08')
            ->assertOk()->assertJsonPath('estimatedProfitItemCount', 0);

        $product->delete();
        $this->assertProfit(20000, 1);
    }

    private function assertProfit(int $profit, int $estimatedItems = 0): void
    {
        foreach (['2026-09-07&end_date=2026-09-07', '2026-09-01&end_date=2026-10-31'] as $range) {
            $this->getJson('/api/reports?start_date='.$range)
                ->assertOk()
                ->assertJsonPath('chartData.0.profit', $profit)
                ->assertJsonPath('estimatedProfitItemCount', $estimatedItems);
        }
    }

    private function product(): Product
    {
        return Product::create([
            'sku' => 'COST-TEST', 'name' => 'Coffee', 'purchase_price' => 5000,
            'selling_price' => 10000, 'stock' => 20, 'minimum_stock' => 0, 'is_active' => true,
        ]);
    }

    private function checkout(Product $product, string $method = 'CASH', ?int $variantId = null): Transaction
    {
        $response = $this->postJson('/api/transactions', [
            'items' => [[
                'product_id' => $product->id, 'variant_id' => $variantId, 'quantity' => 2,
                'purchase_price' => 1, // Client-supplied cost must never override server cost.
            ]],
            'payment_method' => $method, 'payment_amount' => 30000, 'order_type' => 'takeaway',
        ])->assertCreated()->assertJsonMissingPath('data.items.0.purchase_price');

        return Transaction::findOrFail($response->json('data.id'));
    }
}
