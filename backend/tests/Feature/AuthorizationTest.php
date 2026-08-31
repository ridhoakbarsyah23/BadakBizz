<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Role;
use App\Models\Store;
use App\Models\Table;
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

    public function test_cashier_can_still_use_pos_read_and_transaction_routes(): void
    {
        Sanctum::actingAs($this->userWithRole('cashier', 'Cashier'));

        $this->getJson('/api/products')->assertOk();
        $this->getJson('/api/categories')->assertOk();
        $this->getJson('/api/settings')->assertOk();
        $this->getJson('/api/tables')->assertOk();
        $this->getJson('/api/transactions')->assertOk();
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
}
