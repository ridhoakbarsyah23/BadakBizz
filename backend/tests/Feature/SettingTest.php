<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SettingTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_update_store_feature_flags(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        Store::create([
            'name' => 'BadakBizz Test',
            'business_type' => 'retail',
            'enable_table_management' => false,
            'enable_kitchen_receipts' => false,
            'enable_shift_management' => true,
        ]);

        $this->putJson('/api/settings', [
            'name' => 'BadakBizz Test',
            'business_type' => 'fnb',
            'enable_table_management' => true,
            'enable_kitchen_receipts' => true,
            'enable_shift_management' => false,
            'phone' => '08123456789',
            'address' => 'Jl. Test',
            'tax_rate' => 11,
            'service_charge_rate' => 5,
            'receipt_header' => 'BadakBizz Test',
            'receipt_footer' => 'Terima kasih',
            'receipt_width' => 80,
        ])
            ->assertOk()
            ->assertJsonPath('store.enable_table_management', true)
            ->assertJsonPath('store.enable_kitchen_receipts', true)
            ->assertJsonPath('store.enable_shift_management', false);

        $store = Store::first();

        $this->assertTrue((bool) $store->enable_table_management);
        $this->assertTrue((bool) $store->enable_kitchen_receipts);
        $this->assertFalse((bool) $store->enable_shift_management);
    }

    public function test_admin_can_enable_and_disable_shift_management(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        Store::create([
            'name' => 'BadakBizz Test',
            'business_type' => 'fnb',
            'enable_shift_management' => false,
        ]);

        $this->putJson('/api/settings', [
            'name' => 'BadakBizz Test',
            'business_type' => 'fnb',
            'enable_table_management' => true,
            'enable_kitchen_receipts' => false,
            'enable_shift_management' => false,
            'phone' => '08123456789',
            'address' => 'Jl. Test',
            'tax_rate' => 11,
            'service_charge_rate' => 5,
            'receipt_header' => 'BadakBizz Test',
            'receipt_footer' => 'Terima kasih',
            'receipt_width' => 80,
        ])
            ->assertOk()
            ->assertJsonPath('store.enable_shift_management', false);

        $this->assertFalse((bool) Store::first()->enable_shift_management);

        $this->putJson('/api/settings', [
            'name' => 'BadakBizz Test',
            'business_type' => 'fnb',
            'enable_table_management' => true,
            'enable_kitchen_receipts' => false,
            'enable_shift_management' => true,
            'phone' => '08123456789',
            'address' => 'Jl. Test',
            'tax_rate' => 11,
            'service_charge_rate' => 5,
            'receipt_header' => 'BadakBizz Test',
            'receipt_footer' => 'Terima kasih',
            'receipt_width' => 80,
        ])
            ->assertOk()
            ->assertJsonPath('store.enable_shift_management', true);

        $this->assertTrue((bool) Store::first()->enable_shift_management);
    }

    public function test_cashier_cannot_update_shift_management_setting(): void
    {
        Sanctum::actingAs($this->userWithRole('cashier', 'Cashier'));

        Store::create([
            'name' => 'BadakBizz Test',
            'business_type' => 'fnb',
            'enable_shift_management' => false,
        ]);

        $this->putJson('/api/settings', [
            'name' => 'BadakBizz Test',
            'business_type' => 'fnb',
            'enable_shift_management' => true,
        ])->assertForbidden();

        $this->assertFalse((bool) Store::first()->enable_shift_management);
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
