<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Store;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use App\Services\TransactionStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_cash_transaction_decrements_stock_and_records_totals(): void
    {
        $cashier = $this->cashier();
        Sanctum::actingAs($cashier);

        Store::create([
            'name' => 'BadakBiz Test',
            'tax_rate' => 10,
            'service_charge_rate' => 5,
        ]);

        $product = Product::create([
            'sku' => 'SKU-COFFEE',
            'name' => 'Coffee',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 2,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 23_100,
            'discount' => 0,
            'order_type' => 'takeaway',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.subtotal', 20_000)
            ->assertJsonPath('data.service_charge', 1_000)
            ->assertJsonPath('data.tax', 2_100)
            ->assertJsonPath('data.total_amount', 23_100)
            ->assertJsonPath('data.status', 'COMPLETED');

        $this->assertSame(8, $product->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'OUT',
            'quantity' => 2,
            'user_id' => $cashier->id,
        ]);
    }

    public function test_transaction_is_rejected_when_stock_is_insufficient(): void
    {
        Sanctum::actingAs($this->cashier());

        $product = Product::create([
            'sku' => 'SKU-TEA',
            'name' => 'Tea',
            'purchase_price' => 4_000,
            'selling_price' => 8_000,
            'stock' => 1,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 16_000,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Failed to process transaction.');

        $this->assertSame(1, $product->fresh()->stock);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_void_transaction_restores_stock_and_marks_transaction_cancelled(): void
    {
        $admin = $this->admin();
        Sanctum::actingAs($admin);

        $product = Product::create([
            'sku' => 'SKU-RICE',
            'name' => 'Rice Bowl',
            'purchase_price' => 10_000,
            'selling_price' => 20_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $createResponse = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 3],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 66_600,
        ]);

        $transactionId = $createResponse->assertCreated()->json('data.id');
        $this->assertSame(2, $product->fresh()->stock);

        $response = $this->postJson("/api/transactions/{$transactionId}/void");

        $response->assertOk()
            ->assertJsonPath('data.status', 'CANCELLED');

        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame('CANCELLED', Transaction::find($transactionId)->status);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'IN',
            'quantity' => 3,
            'user_id' => $admin->id,
        ]);
    }

    public function test_qris_transaction_reserves_stock_and_increments_customer_when_completed(): void
    {
        Sanctum::actingAs($this->cashier());

        $customer = Customer::create([
            'name' => 'Member One',
            'phone' => '0800000001',
            'total_transactions' => 0,
            'total_spending' => 0,
        ]);

        $product = Product::create([
            'sku' => 'SKU-JUICE',
            'name' => 'Juice',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 4,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'customer_id' => $customer->id,
            'payment_method' => 'QRIS',
            'payment_amount' => 11_100,
        ]);

        $transaction = Transaction::find($response->assertCreated()->json('data.id'));

        $this->assertSame('PENDING', $transaction->status);
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame(0, $customer->fresh()->total_transactions);
        $this->assertEquals(0, $customer->fresh()->total_spending);

        app(TransactionStatusService::class)->complete($transaction);
        app(TransactionStatusService::class)->complete($transaction);

        $this->assertSame('COMPLETED', $transaction->fresh()->status);
        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame(1, $customer->fresh()->total_transactions);
        $this->assertEquals(10_545, $customer->fresh()->total_spending);
    }

    public function test_cancelled_qris_transaction_restores_stock_once_without_customer_spending(): void
    {
        Sanctum::actingAs($this->cashier());

        $customer = Customer::create([
            'name' => 'Member Two',
            'phone' => '0800000002',
            'total_transactions' => 0,
            'total_spending' => 0,
        ]);

        $product = Product::create([
            'sku' => 'SKU-SNACK',
            'name' => 'Snack',
            'purchase_price' => 3_000,
            'selling_price' => 6_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2],
            ],
            'customer_id' => $customer->id,
            'payment_method' => 'QRIS',
            'payment_amount' => 12_654,
        ]);

        $transaction = Transaction::find($response->assertCreated()->json('data.id'));
        $this->assertSame(3, $product->fresh()->stock);

        app(TransactionStatusService::class)->cancel($transaction, null, 'Midtrans Expire');
        app(TransactionStatusService::class)->cancel($transaction, null, 'Midtrans Expire');

        $this->assertSame('CANCELLED', $transaction->fresh()->status);
        $this->assertSame(5, $product->fresh()->stock);
        $this->assertSame(0, $customer->fresh()->total_transactions);
        $this->assertEquals(0, $customer->fresh()->total_spending);
        $this->assertDatabaseCount('inventory_movements', 2);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'IN',
            'quantity' => 2,
            'notes' => 'Midtrans Expire '.$transaction->transaction_number,
        ]);
    }

    public function test_dine_in_qris_transaction_occupies_table_until_completed(): void
    {
        Sanctum::actingAs($this->cashier());

        $table = Table::create(['name' => 'A1', 'status' => 'available']);
        $product = Product::create([
            'sku' => 'SKU-NOODLE',
            'name' => 'Noodle',
            'purchase_price' => 7_000,
            'selling_price' => 15_000,
            'stock' => 3,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'QRIS',
            'payment_amount' => 16_650,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
        ]);

        $transaction = Transaction::find($response->assertCreated()->json('data.id'));

        $this->assertSame('PENDING', $transaction->status);
        $this->assertSame('occupied', $table->fresh()->status);

        app(TransactionStatusService::class)->complete($transaction);

        $this->assertSame('COMPLETED', $transaction->fresh()->status);
        $this->assertSame('available', $table->fresh()->status);
    }

    public function test_occupied_table_cannot_be_used_for_new_transaction(): void
    {
        Sanctum::actingAs($this->cashier());

        $table = Table::create(['name' => 'B1', 'status' => 'occupied']);
        $product = Product::create([
            'sku' => 'SKU-SOUP',
            'name' => 'Soup',
            'purchase_price' => 5_000,
            'selling_price' => 12_000,
            'stock' => 3,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'QRIS',
            'payment_amount' => 13_320,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('error', 'Table is not available.');

        $this->assertSame(3, $product->fresh()->stock);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_completed_cash_dine_in_transaction_releases_table(): void
    {
        Sanctum::actingAs($this->cashier());

        $table = Table::create(['name' => 'C1', 'status' => 'available']);
        $product = Product::create([
            'sku' => 'SKU-PASTA',
            'name' => 'Pasta',
            'purchase_price' => 8_000,
            'selling_price' => 18_000,
            'stock' => 3,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 19_980,
            'order_type' => 'dine_in',
            'table_id' => $table->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.table_id', $table->id)
            ->assertJsonPath('data.status', 'COMPLETED');

        $this->assertSame('available', $table->fresh()->status);
    }

    public function test_transaction_with_product_variant_uses_variant_stock_and_price(): void
    {
        Sanctum::actingAs($this->cashier());

        Store::create([
            'name' => 'BadakBiz Test',
            'tax_rate' => 0,
            'service_charge_rate' => 0,
        ]);

        $product = Product::create([
            'sku' => 'SKU-LATTE',
            'name' => 'Latte',
            'purchase_price' => 8_000,
            'selling_price' => 15_000,
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 0,
            'is_active' => true,
        ]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Large',
            'sku' => 'SKU-LATTE-L',
            'price_adjustment' => 5_000,
            'stock' => 4,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'variant_id' => $variant->id, 'quantity' => 2],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 40_000,
        ]);

        $transactionId = $response->assertCreated()
            ->assertJsonPath('data.subtotal', 40_000)
            ->assertJsonPath('data.items.0.variant_id', $variant->id)
            ->assertJsonPath('data.items.0.price', 20_000)
            ->json('data.id');

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(2, $variant->fresh()->stock);

        Sanctum::actingAs($this->admin());

        $this->postJson("/api/transactions/{$transactionId}/void")->assertOk();

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(4, $variant->fresh()->stock);
    }

    public function test_product_with_variants_requires_variant_id(): void
    {
        Sanctum::actingAs($this->cashier());

        $product = Product::create([
            'sku' => 'SKU-TEA-VARIANT',
            'name' => 'Tea Variant',
            'purchase_price' => 4_000,
            'selling_price' => 8_000,
            'has_variants' => true,
            'stock' => 10,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Hot',
            'sku' => 'SKU-TEA-HOT',
            'price_adjustment' => 0,
            'stock' => 5,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 8_880,
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('error', 'Variant is required for product: Tea Variant');

        $this->assertDatabaseCount('transactions', 0);
    }

    private function cashier(): User
    {
        return $this->userWithRole('cashier', 'Cashier');
    }

    private function admin(): User
    {
        return $this->userWithRole('admin', 'Administrator');
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
