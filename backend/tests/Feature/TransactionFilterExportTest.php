<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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

    private function createTransaction(
        string $transactionNumber,
        string $createdAt,
        string $paymentMethod = 'CASH',
        string $status = 'COMPLETED'
    ): Transaction {
        $transaction = Transaction::create([
            'transaction_number' => $transactionNumber,
            'subtotal' => 10_000,
            'tax' => 1_100,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 11_100,
            'payment_amount' => 11_100,
            'payment_method' => $paymentMethod,
            'status' => $status,
            'order_type' => 'takeaway',
        ]);

        $transaction->created_at = $createdAt;
        $transaction->updated_at = $createdAt;
        $transaction->save();

        return $transaction;
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
