<?php

namespace Tests\Feature;

use App\Models\CashierShift;
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
use Illuminate\Support\Carbon;
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
            'name' => 'BadakBizz Test',
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
        $this->assertNotNull($response->json('data.cashier_shift_id'));
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'OUT',
            'quantity' => 2,
            'user_id' => $cashier->id,
        ]);
    }

    public function test_transaction_number_uses_daily_sequence(): void
    {
        Carbon::setTestNow('2026-08-30 09:15:00');

        $cashier = $this->cashier();
        Sanctum::actingAs($cashier);

        Store::create([
            'name' => 'BadakBizz Test',
            'tax_rate' => 0,
            'service_charge_rate' => 0,
        ]);

        $product = Product::create([
            'sku' => 'SKU-SEQUENCE',
            'name' => 'Sequence Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 2,
            'is_active' => true,
        ]);

        $firstResponse = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 10_000,
            'order_type' => 'takeaway',
        ]);

        $secondResponse = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 10_000,
            'order_type' => 'takeaway',
        ]);

        $firstResponse->assertCreated()
            ->assertJsonPath('data.transaction_number', 'TRX-20260830-0001');

        $secondResponse->assertCreated()
            ->assertJsonPath('data.transaction_number', 'TRX-20260830-0002');

        Carbon::setTestNow();
    }

    public function test_transaction_is_rejected_without_active_shift(): void
    {
        Sanctum::actingAs($this->cashier(withOpenShift: false));

        Store::create([
            'name' => 'BadakBizz Test',
            'enable_shift_management' => true,
        ]);

        $product = Product::create([
            'sku' => 'SKU-NO-SHIFT',
            'name' => 'No Shift Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 2,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 10_000,
            'order_type' => 'takeaway',
        ]);

        $response->assertStatus(400)
            ->assertJsonPath('message', 'Failed to process transaction.')
            ->assertJsonPath('error', 'Open an active cashier shift before checkout.');

        $this->assertSame(10, $product->fresh()->stock);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_transaction_without_shift_is_allowed_when_shift_management_setting_is_disabled(): void
    {
        Sanctum::actingAs($this->cashier(withOpenShift: false));

        Store::create([
            'name' => 'BadakBizz Test',
            'tax_rate' => 0,
            'service_charge_rate' => 0,
            'enable_shift_management' => false,
        ]);

        $product = Product::create([
            'sku' => 'SKU-SHIFT-DISABLED',
            'name' => 'Shift Optional Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 2,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 10_000,
            'order_type' => 'takeaway',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'COMPLETED')
            ->assertJsonPath('data.cashier_shift_id', null);

        $this->assertSame(9, $product->fresh()->stock);
        $this->assertDatabaseCount('transactions', 1);
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
            'name' => 'BadakBizz Test',
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
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'type' => 'OUT',
            'quantity' => 2,
        ]);

        Sanctum::actingAs($this->admin());

        $this->postJson("/api/transactions/{$transactionId}/void")->assertOk();

        $this->assertSame(0, $product->fresh()->stock);
        $this->assertSame(4, $variant->fresh()->stock);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'type' => 'IN',
            'quantity' => 2,
        ]);
    }

    public function test_transaction_items_can_store_notes(): void
    {
        Sanctum::actingAs($this->cashier());

        Store::create([
            'name' => 'BadakBizz Test',
            'tax_rate' => 0,
            'service_charge_rate' => 0,
        ]);

        $product = Product::create([
            'sku' => 'SKU-NOTE',
            'name' => 'Noodle Special',
            'purchase_price' => 8_000,
            'selling_price' => 18_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 1,
                    'notes' => 'Tidak pedas, tanpa daun bawang',
                ],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 18_000,
            'order_type' => 'takeaway',
        ]);

        $transactionId = $response->assertCreated()
            ->assertJsonPath('data.items.0.notes', 'Tidak pedas, tanpa daun bawang')
            ->json('data.id');

        $this->getJson("/api/transactions?search={$response->json('data.transaction_number')}")
            ->assertOk()
            ->assertJsonPath('0.id', $transactionId)
            ->assertJsonPath('0.items.0.notes', 'Tidak pedas, tanpa daun bawang');

        $this->assertDatabaseHas('transaction_items', [
            'transaction_id' => $transactionId,
            'product_id' => $product->id,
            'notes' => 'Tidak pedas, tanpa daun bawang',
        ]);
    }

    public function test_transaction_can_store_order_notes(): void
    {
        Sanctum::actingAs($this->cashier());

        Store::create([
            'name' => 'BadakBizz Test',
            'tax_rate' => 0,
            'service_charge_rate' => 0,
        ]);

        $product = Product::create([
            'sku' => 'SKU-ORDER-NOTE',
            'name' => 'Nasi Goreng',
            'purchase_price' => 10_000,
            'selling_price' => 20_000,
            'stock' => 5,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/transactions', [
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1],
            ],
            'payment_method' => 'CASH',
            'payment_amount' => 20_000,
            'order_type' => 'takeaway',
            'notes' => 'Ambil jam 7 malam',
        ]);

        $transactionId = $response->assertCreated()
            ->assertJsonPath('data.notes', 'Ambil jam 7 malam')
            ->json('data.id');

        $this->getJson("/api/transactions?search={$response->json('data.transaction_number')}")
            ->assertOk()
            ->assertJsonPath('0.id', $transactionId)
            ->assertJsonPath('0.notes', 'Ambil jam 7 malam');

        $this->assertDatabaseHas('transactions', [
            'id' => $transactionId,
            'notes' => 'Ambil jam 7 malam',
        ]);
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

    public function test_transactions_can_be_filtered_by_status_payment_and_search(): void
    {
        Sanctum::actingAs($this->cashier());

        $customer = Customer::create([
            'name' => 'Pending Member',
            'phone' => '0800000020',
        ]);

        Transaction::create([
            'transaction_number' => 'TRX-PENDING-001',
            'customer_id' => $customer->id,
            'subtotal' => 10_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 10_000,
            'payment_amount' => 10_000,
            'payment_method' => 'QRIS',
            'status' => 'PENDING',
            'order_type' => 'takeaway',
            'qris_string' => '000201010212',
        ]);

        Transaction::create([
            'transaction_number' => 'TRX-CASH-001',
            'subtotal' => 8_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 8_000,
            'payment_amount' => 8_000,
            'payment_method' => 'CASH',
            'status' => 'COMPLETED',
            'order_type' => 'takeaway',
        ]);

        $this->getJson('/api/transactions?status=PENDING&payment_method=QRIS&search=Pending')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.transaction_number', 'TRX-PENDING-001')
            ->assertJsonPath('0.qris_string', '000201010212');
    }

    public function test_cashier_can_cancel_pending_qris_and_restore_stock_and_table(): void
    {
        $cashier = $this->cashier();
        Sanctum::actingAs($cashier);

        $table = Table::create(['name' => 'P1', 'status' => 'occupied']);
        $product = Product::create([
            'sku' => 'SKU-PENDING-CANCEL',
            'name' => 'Pending Cancel Product',
            'purchase_price' => 4_000,
            'selling_price' => 9_000,
            'stock' => 3,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);

        $transaction = Transaction::create([
            'transaction_number' => 'TRX-CANCEL-PENDING',
            'subtotal' => 9_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 9_000,
            'payment_amount' => 9_000,
            'payment_method' => 'QRIS',
            'status' => 'PENDING',
            'order_type' => 'dine_in',
            'table_id' => $table->id,
        ]);

        $transaction->items()->create([
            'product_id' => $product->id,
            'quantity' => 2,
            'price' => 9_000,
            'subtotal' => 18_000,
        ]);
        $product->decrement('stock', 2);

        $this->postJson("/api/transactions/{$transaction->id}/cancel-pending-qris")
            ->assertOk()
            ->assertJsonPath('data.status', 'CANCELLED');

        $this->assertSame(3, $product->fresh()->stock);
        $this->assertSame('available', $table->fresh()->status);
        $this->assertDatabaseHas('inventory_movements', [
            'product_id' => $product->id,
            'type' => 'IN',
            'quantity' => 2,
            'user_id' => $cashier->id,
            'notes' => 'Cancel Pending QRIS TRX-CANCEL-PENDING',
        ]);
    }

    public function test_cancel_pending_qris_rejects_completed_transactions(): void
    {
        Sanctum::actingAs($this->cashier());

        $transaction = Transaction::create([
            'transaction_number' => 'TRX-COMPLETED-CANCEL',
            'subtotal' => 10_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 10_000,
            'payment_amount' => 10_000,
            'payment_method' => 'QRIS',
            'status' => 'COMPLETED',
            'order_type' => 'takeaway',
        ]);

        $this->postJson("/api/transactions/{$transaction->id}/cancel-pending-qris")
            ->assertStatus(400)
            ->assertJsonPath('message', 'Only pending QRIS transactions can be cancelled from this action');
    }

    private function cashier(bool $withOpenShift = true): User
    {
        return $this->userWithRole('cashier', 'Cashier', $withOpenShift);
    }

    private function admin(bool $withOpenShift = true): User
    {
        return $this->userWithRole('admin', 'Administrator', $withOpenShift);
    }

    private function userWithRole(string $slug, string $name, bool $withOpenShift = true): User
    {
        $role = Role::create([
            'slug' => $slug,
            'name' => $name,
        ]);

        $user = User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);

        if ($withOpenShift) {
            CashierShift::create([
                'user_id' => $user->id,
                'start_time' => now(),
                'starting_cash' => 0,
                'status' => 'open',
            ]);
        }

        return $user;
    }
}
