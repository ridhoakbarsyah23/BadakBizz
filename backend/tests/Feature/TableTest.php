<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Table;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TableTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_can_list_tables(): void
    {
        Sanctum::actingAs($this->userWithRole('cashier', 'Cashier'));

        Table::create(['name' => 'A1']);
        Table::create(['name' => 'A2', 'status' => 'reserved']);

        $this->getJson('/api/tables')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonPath('0.name', 'A1')
            ->assertJsonPath('1.status', 'reserved');
    }

    public function test_admin_can_create_table(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        $this->postJson('/api/tables', [
            'name' => 'B1',
        ])->assertCreated()
            ->assertJsonPath('name', 'B1')
            ->assertJsonPath('status', 'available');

        $this->assertDatabaseHas('tables', [
            'name' => 'B1',
            'status' => 'available',
        ]);
    }

    public function test_occupied_table_cannot_be_deleted(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        $table = Table::create(['name' => 'C1', 'status' => 'occupied']);

        $this->deleteJson("/api/tables/{$table->id}")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Occupied table cannot be deleted');

        $this->assertDatabaseHas('tables', ['id' => $table->id]);
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
