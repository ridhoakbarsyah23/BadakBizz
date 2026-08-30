<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_first_registered_user_becomes_admin(): void
    {
        $response = $this->postJson('/api/register', [
            'name' => 'First Owner',
            'email' => 'owner@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'owner@example.test')
            ->assertJsonPath('user.role.slug', 'admin')
            ->assertJsonStructure(['access_token', 'user']);
    }

    public function test_next_registered_user_becomes_cashier(): void
    {
        Role::firstOrCreate(['slug' => 'admin'], ['name' => 'Administrator']);
        User::factory()->create();

        $response = $this->postJson('/api/register', [
            'name' => 'New Cashier',
            'email' => 'cashier-new@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'cashier-new@example.test')
            ->assertJsonPath('user.role.slug', 'cashier');
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.test']);

        $response = $this->postJson('/api/register', [
            'name' => 'Taken Email',
            'email' => 'taken@example.test',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertUnprocessable();
    }
}
