<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TransactionFilterExportTest extends TestCase
{
    use RefreshDatabase;

    public function test_transactions_can_be_filtered_by_single_or_range_date(): void
    {
        Sanctum::actingAs($this->admin());

        $this->createTransaction('TRX-OLD', '2026-08-27 10:00:00');
        $this->createTransaction('TRX-TODAY', '2026-08-29 10:00:00');

        $this->getJson('/api/transactions?start_date=2026-08-29&end_date=2026-08-29')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['transaction_number' => 'TRX-TODAY'])
            ->assertJsonMissing(['transaction_number' => 'TRX-OLD']);

        $this->getJson('/api/transactions?start_date=2026-08-27&end_date=2026-08-29')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_report_export_respects_transaction_filters(): void
    {
        Sanctum::actingAs($this->admin());

        $this->createTransaction('TRX-CASH', '2026-08-29 10:00:00', 'CASH', 'COMPLETED');
        $this->createTransaction('TRX-QRIS', '2026-08-29 11:00:00', 'QRIS', 'PENDING');
        $this->createTransaction('TRX-OLD', '2026-08-28 10:00:00', 'CASH', 'COMPLETED');

        $response = $this->get('/api/reports/export?start_date=2026-08-29&end_date=2026-08-29&payment_method=CASH&status=COMPLETED');

        $response->assertOk();
        $this->assertStringStartsWith('text/csv', $response->headers->get('Content-type'));

        $content = $response->streamedContent();

        $this->assertStringContainsString('TRX-CASH', $content);
        $this->assertStringNotContainsString('TRX-QRIS', $content);
        $this->assertStringNotContainsString('TRX-OLD', $content);
    }

    public function test_report_export_includes_order_notes_items_and_item_notes(): void
    {
        Sanctum::actingAs($this->admin());

        $product = $this->createProduct('SKU-NOTE-EXPORT', 'Noodle Special');
        $product->update(['has_variants' => true]);

        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'name' => 'Pedas',
            'sku' => 'SKU-NOTE-EXPORT-PEDAS',
            'price_adjustment' => 2_000,
            'stock' => 5,
        ]);

        $transaction = $this->createTransaction('TRX-NOTE-EXPORT', '2026-08-29 12:00:00');
        $transaction->update(['notes' => 'Antar ke meja luar']);
        $transaction->items()->create([
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'quantity' => 2,
            'price' => 12_000,
            'subtotal' => 24_000,
            'notes' => 'Tanpa daun bawang',
        ]);

        $response = $this->get('/api/reports/export?start_date=2026-08-29&end_date=2026-08-29');

        $response->assertOk();

        $content = $response->streamedContent();

        $this->assertStringContainsString('Order Notes', $content);
        $this->assertStringContainsString('Items', $content);
        $this->assertStringContainsString('Item Notes', $content);
        $this->assertStringContainsString('Antar ke meja luar', $content);
        $this->assertStringContainsString('Noodle Special - Pedas x2', $content);
        $this->assertStringContainsString('Noodle Special - Pedas: Tanpa daun bawang', $content);
    }

    public function test_report_export_can_return_excel_file(): void
    {
        Sanctum::actingAs($this->admin());

        $this->createTransaction('TRX-XLSX', '2026-08-29 10:00:00');

        $response = $this->get('/api/reports/export?start_date=2026-08-29&end_date=2026-08-29&format=excel');

        $response->assertOk();
        $this->assertStringStartsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('.xlsx', $response->headers->get('Content-Disposition'));
        $this->assertStringStartsWith('PK', $response->getContent());
    }

    public function test_dashboard_metrics_only_include_completed_transactions(): void
    {
        Carbon::setTestNow('2026-08-29 12:00:00');
        Sanctum::actingAs($this->admin());

        $completedProduct = $this->createProduct('SKU-DASH-COMPLETE', 'Completed Product');
        $pendingProduct = $this->createProduct('SKU-DASH-PENDING', 'Pending Product');
        $variantProductWithStock = $this->createProduct('SKU-DASH-VARIANT-STOCK', 'Variant Stock Product');
        $variantProductWithStock->update([
            'has_variants' => true,
            'stock' => 0,
            'minimum_stock' => 2,
        ]);
        ProductVariant::create([
            'product_id' => $variantProductWithStock->id,
            'name' => 'Large',
            'sku' => 'SKU-DASH-VARIANT-STOCK-L',
            'price_adjustment' => 0,
            'stock' => 8,
        ]);
        $lowVariantProduct = $this->createProduct('SKU-DASH-VARIANT-LOW', 'Low Variant Product');
        $lowVariantProduct->update([
            'has_variants' => true,
            'stock' => 99,
            'minimum_stock' => 3,
        ]);
        ProductVariant::create([
            'product_id' => $lowVariantProduct->id,
            'name' => 'Small',
            'sku' => 'SKU-DASH-VARIANT-LOW-S',
            'price_adjustment' => 0,
            'stock' => 1,
        ]);
        $outProduct = $this->createProduct('SKU-DASH-OUT', 'Out Product');
        $outProduct->update([
            'stock' => 0,
            'minimum_stock' => 3,
        ]);

        $completed = $this->createTransaction('TRX-DASH-COMPLETE', '2026-08-29 10:00:00', 'CASH', 'COMPLETED', 50_000);
        $pending = $this->createTransaction('TRX-DASH-PENDING', '2026-08-29 11:00:00', 'QRIS', 'PENDING', 99_000);
        $cancelled = $this->createTransaction('TRX-DASH-CANCELLED', '2026-08-29 11:30:00', 'CASH', 'CANCELLED', 77_000);

        $completed->items()->create([
            'product_id' => $completedProduct->id,
            'quantity' => 2,
            'price' => 25_000,
            'subtotal' => 50_000,
        ]);
        $pending->items()->create([
            'product_id' => $pendingProduct->id,
            'quantity' => 9,
            'price' => 11_000,
            'subtotal' => 99_000,
        ]);
        $cancelled->items()->create([
            'product_id' => $pendingProduct->id,
            'quantity' => 7,
            'price' => 11_000,
            'subtotal' => 77_000,
        ]);

        $response = $this->getJson('/api/dashboard?filter=today')
            ->assertOk();

        $this->assertSame(50_000, $response->json('revenueToday'));
        $this->assertSame(1, $response->json('transactionsToday'));
        $this->assertSame('Completed Product', $response->json('topProducts.0.name'));
        $this->assertSame(2, $response->json('topProducts.0.total_sold'));
        $this->assertSame(50_000, collect($response->json('salesTrend'))->last()['revenue']);
        $this->assertSame(1, collect($response->json('salesTrend'))->last()['transactions']);
        $this->assertContains('Low Variant Product', collect($response->json('lowStockProducts'))->pluck('name'));
        $this->assertNotContains('Out Product', collect($response->json('lowStockProducts'))->pluck('name'));
        $this->assertContains('Out Product', collect($response->json('outOfStockProducts'))->pluck('name'));
        $this->assertNotContains('Variant Stock Product', collect($response->json('lowStockProducts'))->pluck('name'));

        Carbon::setTestNow();
    }

    public function test_report_metrics_only_include_completed_transactions(): void
    {
        Sanctum::actingAs($this->admin());

        $completedProduct = $this->createProduct('SKU-REPORT-COMPLETE', 'Report Completed Product');
        $pendingProduct = $this->createProduct('SKU-REPORT-PENDING', 'Report Pending Product');

        $completed = $this->createTransaction('TRX-REPORT-COMPLETE', '2026-08-29 10:15:00', 'CASH', 'COMPLETED', 40_000);
        $pending = $this->createTransaction('TRX-REPORT-PENDING', '2026-08-29 11:15:00', 'QRIS', 'PENDING', 90_000);
        $cancelled = $this->createTransaction('TRX-REPORT-CANCELLED', '2026-08-29 12:15:00', 'CASH', 'CANCELLED', 80_000);

        $completed->items()->create([
            'product_id' => $completedProduct->id,
            'quantity' => 4,
            'price' => 10_000,
            'subtotal' => 40_000,
        ]);
        $pending->items()->create([
            'product_id' => $pendingProduct->id,
            'quantity' => 9,
            'price' => 10_000,
            'subtotal' => 90_000,
        ]);
        $cancelled->items()->create([
            'product_id' => $pendingProduct->id,
            'quantity' => 8,
            'price' => 10_000,
            'subtotal' => 80_000,
        ]);

        $response = $this->getJson('/api/reports?start_date=2026-08-29&end_date=2026-08-29')
            ->assertOk();

        $this->assertSame(40_000, $response->json('totalRevenue'));
        $this->assertSame(40_000, $response->json('averageTransaction'));
        $this->assertSame('Report Completed Product', $response->json('topSellingItem.name'));
        $this->assertSame(4, $response->json('topSellingItem.sold'));
        $this->assertSame('10:00 - 11:00', $response->json('busiestHour'));
        $this->assertSame(1, $response->json('busiestHourCount'));
        $this->assertSame(1, collect($response->json('hourlyTransactions'))->firstWhere('hour', '10')['transactions']);
        $this->assertSame(0, collect($response->json('hourlyTransactions'))->firstWhere('hour', '09')['transactions']);
        $this->assertSame(40_000, collect($response->json('chartData'))->firstWhere('label', '29 Aug')['sales']);
    }

    public function test_report_busiest_hour_handles_midnight_transactions(): void
    {
        Sanctum::actingAs($this->admin());

        $this->createTransaction('TRX-MIDNIGHT-1', '2026-08-29 00:05:00');
        $this->createTransaction('TRX-MIDNIGHT-2', '2026-08-29 00:45:00');
        $this->createTransaction('TRX-MORNING', '2026-08-29 09:15:00');

        $this->getJson('/api/reports?start_date=2026-08-29&end_date=2026-08-29')
            ->assertOk()
            ->assertJsonPath('busiestHour', '00:00 - 01:00')
            ->assertJsonPath('busiestHourCount', 2)
            ->assertJsonPath('hourlyTransactions.0.transactions', 2);
    }

    private function createTransaction(
        string $transactionNumber,
        string $createdAt,
        string $paymentMethod = 'CASH',
        string $status = 'COMPLETED',
        int $totalAmount = 11_100
    ): Transaction {
        $transaction = Transaction::create([
            'transaction_number' => $transactionNumber,
            'subtotal' => $totalAmount,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => $totalAmount,
            'payment_amount' => $totalAmount,
            'payment_method' => $paymentMethod,
            'status' => $status,
            'order_type' => 'takeaway',
        ]);

        $transaction->created_at = $createdAt;
        $transaction->updated_at = $createdAt;
        $transaction->save();

        return $transaction;
    }

    private function createProduct(string $sku, string $name): Product
    {
        return Product::create([
            'sku' => $sku,
            'name' => $name,
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 2,
            'is_active' => true,
        ]);
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
