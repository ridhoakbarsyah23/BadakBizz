<?php

namespace Tests\Feature;

use App\Models\CashierShift;
use App\Models\Role;
use App\Models\Transaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShiftTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_monitor_all_cashier_shifts(): void
    {
        Sanctum::actingAs($this->userWithRole('admin', 'Administrator'));

        $firstCashier = $this->userWithRole('cashier', 'Cashier One');
        $secondCashier = $this->userWithRole('cashier', 'Cashier Two');

        $firstShift = $this->createShift($firstCashier, 'open');
        $secondShift = $this->createShift($secondCashier, 'closed', 50_000, 165_000);
        $this->createTransaction($firstShift, 35_000, 'CASH', 'COMPLETED');
        $this->createTransaction($secondShift, 100_000, 'CASH', 'COMPLETED');
        $this->createTransaction($secondShift, 25_000, 'QRIS', 'COMPLETED');

        $this->getJson('/api/shifts')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment([
                'user_id' => $firstCashier->id,
                'status' => 'open',
                'cash_sales' => 35_000,
                'expected_cash' => 35_000,
                'transaction_count' => 1,
            ])
            ->assertJsonFragment([
                'user_id' => $secondCashier->id,
                'status' => 'closed',
                'cash_sales' => 100_000,
                'total_sales' => 125_000,
                'expected_cash' => 150_000,
                'discrepancy' => 15_000,
                'transaction_count' => 2,
            ]);
    }

    public function test_cashier_can_only_see_own_shifts(): void
    {
        $cashier = $this->userWithRole('cashier', 'Cashier');
        $otherCashier = $this->userWithRole('cashier', 'Other Cashier');
        Sanctum::actingAs($cashier);

        $ownShift = $this->createShift($cashier, 'open');
        $this->createShift($otherCashier, 'open');
        $this->createTransaction($ownShift, 20_000, 'CASH', 'COMPLETED');

        $this->getJson('/api/shifts')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.user_id', $cashier->id)
            ->assertJsonPath('0.cash_sales', 20_000)
            ->assertJsonPath('0.expected_cash', 20_000);
    }

    public function test_cashier_close_shift_returns_cash_summary_and_discrepancy(): void
    {
        $cashier = $this->userWithRole('cashier', 'Cashier');
        Sanctum::actingAs($cashier);

        $shift = $this->createShift($cashier, 'open', 50_000);
        $this->createTransaction($shift, 100_000, 'CASH', 'COMPLETED');
        $this->createTransaction($shift, 40_000, 'QRIS', 'COMPLETED');
        $this->createTransaction($shift, 30_000, 'CASH', 'CANCELLED');

        $this->postJson('/api/shifts/close', [
            'ending_cash' => 145_000,
        ])
            ->assertOk()
            ->assertJsonPath('shift.status', 'closed')
            ->assertJsonPath('shift.cash_sales', 100_000)
            ->assertJsonPath('shift.total_sales', 140_000)
            ->assertJsonPath('shift.expected_cash', 150_000)
            ->assertJsonPath('shift.discrepancy', -5_000)
            ->assertJsonPath('shift.transaction_count', 2);
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

    private function createShift(
        User $user,
        string $status,
        int $startingCash = 0,
        ?int $endingCash = null
    ): CashierShift {
        return CashierShift::create([
            'user_id' => $user->id,
            'start_time' => now()->subHours(2),
            'end_time' => $status === 'closed' ? now() : null,
            'starting_cash' => $startingCash,
            'ending_cash' => $endingCash,
            'status' => $status,
        ]);
    }

    private function createTransaction(
        CashierShift $shift,
        int $totalAmount,
        string $paymentMethod,
        string $status
    ): Transaction {
        return Transaction::create([
            'transaction_number' => 'TRX-SHIFT-'.fake()->unique()->numerify('####'),
            'cashier_id' => $shift->user_id,
            'cashier_shift_id' => $shift->id,
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
    }
}
