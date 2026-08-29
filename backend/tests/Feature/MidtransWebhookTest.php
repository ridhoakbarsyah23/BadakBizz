<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
