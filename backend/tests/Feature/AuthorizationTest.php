<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Customer;
use App\Models\Product;
use App\Models\Role;
use App\Models\Store;
use App\Models\Table;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthorizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_cannot_access_admin_only_routes(): void
    {
        Sanctum::actingAs($this->userWithRole('cashier', 'Cashier'));

        Store::create(['name' => 'BadakBizz Test']);
        $category = Category::create(['name' => 'Food', 'slug' => 'food']);
        $product = Product::create([
            'sku' => 'SKU-AUTH',
            'name' => 'Auth Product',
            'category_id' => $category->id,
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 10,
            'minimum_stock' => 1,
            'is_active' => true,
        ]);
        $table = Table::create(['name' => 'A1']);
        $customer = Customer::create(['name' => 'Blocked Customer']);

        $adminRequests = [
            ['GET', '/api/dashboard'],
            ['GET', '/api/reports'],
            ['PUT', '/api/settings', ['name' => 'Blocked']],
            ['POST', '/api/tables', ['name' => 'B1']],
            ['PUT', "/api/tables/{$table->id}", ['name' => 'A2']],
            ['DELETE', "/api/tables/{$table->id}"],
            ['GET', '/api/staff'],
            ['POST', '/api/staff', [
                'name' => 'Blocked Staff',
                'email' => 'blocked@example.test',
                'password' => 'password',
                'role_id' => Role::where('slug', 'cashier')->value('id'),
            ]],
            ['GET', '/api/roles'],
            ['GET', "/api/customers/{$customer->id}"],
            ['POST', '/api/categories', ['name' => 'Blocked']],
            ['PUT', "/api/categories/{$category->id}", ['name' => 'Blocked']],
            ['DELETE', "/api/categories/{$category->id}"],
            ['POST', '/api/products', ['name' => 'Blocked']],
            ['PUT', "/api/products/{$product->id}", ['name' => 'Blocked']],
            ['DELETE', "/api/products/{$product->id}"],
            ['GET', '/api/inventory/movements'],
            ['POST', '/api/inventory/restock', [
                'product_id' => $product->id,
                'quantity' => 1,
            ]],
            ['POST', '/api/inventory/adjust', [
                'product_id' => $product->id,
                'actual_stock' => 9,
                'reason' => 'Blocked adjustment',
            ]],
        ];

        foreach ($adminRequests as $adminRequest) {
            [$method, $uri] = $adminRequest;
            $payload = $adminRequest[2] ?? [];

            $this->json($method, $uri, $payload)->assertForbidden();
        }
    }

    public function test_cashier_cannot_update_or_delete_customers(): void
    {
        Sanctum::actingAs($this->userWithRole('cashier', 'Cashier'));

        $customer = Customer::create([
            'name' => 'Protected Customer',
            'phone' => '08123456789',
            'email' => 'customer@example.test',
        ]);

        $this->putJson("/api/customers/{$customer->id}", [
            'name' => 'Changed Customer',
        ])->assertForbidden();

        $this->deleteJson("/api/customers/{$customer->id}")
            ->assertForbidden();
    }

    public function test_cashier_only_sees_own_transactions(): void
    {
        $cashier = $this->userWithRole('cashier', 'Cashier');
        $otherCashier = $this->userWithRole('cashier-other', 'Other Cashier');

        Transaction::create($this->transactionPayload('TRX-OWN', $cashier->id));
        Transaction::create($this->transactionPayload('TRX-OTHER', $otherCashier->id));

        Sanctum::actingAs($cashier);

        $response = $this->getJson('/api/transactions');

        $response->assertOk();
        $numbers = collect($response->json())->pluck('transaction_number');

        $this->assertTrue($numbers->contains('TRX-OWN'));
        $this->assertFalse($numbers->contains('TRX-OTHER'));
    }

    public function test_cashier_cannot_access_other_cashiers_qris_transaction(): void
    {
        $cashier = $this->userWithRole('cashier', 'Cashier');
        $otherCashier = $this->userWithRole('cashier-other', 'Other Cashier');
        $transaction = Transaction::create($this->transactionPayload(
            'TRX-OTHER-QRIS',
            $otherCashier->id,
            'QRIS',
            'PENDING',
        ));

        Sanctum::actingAs($cashier);

        $this->getJson("/api/qris/status/{$transaction->transaction_number}")
            ->assertForbidden();

        $this->postJson("/api/transactions/{$transaction->id}/cancel-pending-qris")
            ->assertForbidden();
    }

    public function test_cashier_can_still_use_pos_read_and_transaction_routes(): void
    {
        Sanctum::actingAs($this->userWithRole('cashier', 'Cashier'));

        $this->getJson('/api/products')->assertOk();
        $this->getJson('/api/categories')->assertOk();
        $this->getJson('/api/settings')->assertOk();
        $this->getJson('/api/tables')->assertOk();
        $this->getJson('/api/transactions')->assertOk();
    }

    public function test_unauthenticated_api_requests_return_json_unauthorized_response(): void
    {
        $this->get('/api/settings')
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    private function userWithRole(string $slug, string $name): User
    {
        $role = Role::firstOrCreate(
            ['slug' => $slug],
            ['name' => $name]
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }

    private function transactionPayload(
        string $transactionNumber,
        int $cashierId,
        string $paymentMethod = 'CASH',
        string $status = 'COMPLETED',
    ): array {
        return [
            'transaction_number' => $transactionNumber,
            'cashier_id' => $cashierId,
            'subtotal' => 10_000,
            'tax' => 0,
            'service_charge' => 0,
            'discount' => 0,
            'total_amount' => 10_000,
            'payment_amount' => $paymentMethod === 'QRIS' ? 0 : 10_000,
            'payment_method' => $paymentMethod,
            'status' => $status,
            'order_type' => 'takeaway',
        ];
    }
}
