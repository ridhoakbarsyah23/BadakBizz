<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MidtransWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_rejects_invalid_signature(): void
    {
        config(['services.midtrans.server_key' => 'server-test-key']);

        $transaction = $this->pendingTransaction();

        $this->postJson('/api/midtrans/webhook', [
            'order_id' => $transaction->transaction_number,
            'status_code' => '200',
            'gross_amount' => '10000.00',
            'signature_key' => 'invalid-signature',
            'transaction_status' => 'settlement',
        ])->assertForbidden()
            ->assertJsonPath('message', 'Invalid Midtrans signature');

        $this->assertSame('PENDING', $transaction->fresh()->status);
    }

    public function test_webhook_completes_transaction_with_valid_signature(): void
    {
        config(['services.midtrans.server_key' => 'server-test-key']);

        $customer = Customer::create([
            'name' => 'Webhook Member',
            'phone' => '0800000010',
            'total_transactions' => 0,
            'total_spending' => 0,
        ]);

        $transaction = $this->pendingTransaction([
            'customer_id' => $customer->id,
            'total_amount' => 10_000,
        ]);

        $payload = [
            'order_id' => $transaction->transaction_number,
            'status_code' => '200',
            'gross_amount' => '10000.00',
            'transaction_status' => 'settlement',
        ];
        $payload['signature_key'] = $this->signature($payload, 'server-test-key');

        $this->postJson('/api/midtrans/webhook', $payload)
            ->assertOk()
            ->assertJsonPath('message', 'Webhook received');

        $this->assertSame('COMPLETED', $transaction->fresh()->status);
        $this->assertSame(1, $customer->fresh()->total_transactions);
        $this->assertEquals(10_000, $customer->fresh()->total_spending);
    }

    public function test_webhook_requires_server_key_configuration(): void
    {
        config(['services.midtrans.server_key' => null]);

        $this->postJson('/api/midtrans/webhook', [
            'order_id' => 'TRX-TEST',
            'status_code' => '200',
            'gross_amount' => '10000.00',
            'signature_key' => 'signature',
            'transaction_status' => 'settlement',
        ])->assertStatus(500)
            ->assertJsonPath('message', 'Midtrans server key is not configured');
    }

    public function test_qris_generate_rejects_amount_that_does_not_match_transaction_total(): void
    {
        Sanctum::actingAs(User::factory()->create(['is_active' => true]));

        $transaction = $this->pendingTransaction([
            'total_amount' => 15_000,
            'payment_amount' => 15_000,
        ]);

        $this->postJson('/api/qris/generate', [
            'order_id' => $transaction->transaction_number,
            'gross_amount' => 10_000,
        ])->assertUnprocessable()
            ->assertJsonPath('message', 'QRIS amount does not match transaction total');

        $this->assertNull($transaction->fresh()->midtrans_transaction_id);
        $this->assertNull($transaction->fresh()->qris_string);
    }

    public function test_pending_webhook_does_not_reopen_cancelled_transaction(): void
    {
        config(['services.midtrans.server_key' => 'server-test-key']);

        $transaction = $this->pendingTransaction([
            'status' => 'CANCELLED',
        ]);

        $payload = [
            'order_id' => $transaction->transaction_number,
            'status_code' => '200',
            'gross_amount' => '10000.00',
            'transaction_status' => 'pending',
        ];
        $payload['signature_key'] = $this->signature($payload, 'server-test-key');

        $this->postJson('/api/midtrans/webhook', $payload)
            ->assertOk()
            ->assertJsonPath('message', 'Webhook received');

        $this->assertSame('CANCELLED', $transaction->fresh()->status);
    }

    private function pendingTransaction(array $overrides = []): Transaction
    {
        return Transaction::create(array_merge([
            'transaction_number' => 'TRX-WEBHOOK-'.str()->upper(str()->random(6)),
            'subtotal' => 10_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 10_000,
            'payment_amount' => 10_000,
            'payment_method' => 'QRIS',
            'status' => 'PENDING',
            'order_type' => 'takeaway',
        ], $overrides));
    }

    private function signature(array $payload, string $serverKey): string
    {
        return hash(
            'sha512',
            $payload['order_id'].$payload['status_code'].$payload['gross_amount'].$serverKey
        );
    }
}
