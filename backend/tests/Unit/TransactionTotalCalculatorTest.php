<?php

namespace Tests\Unit;

use App\Services\TransactionTotalCalculator;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class TransactionTotalCalculatorTest extends TestCase
{
    #[DataProvider('totalCases')]
    public function test_it_calculates_integer_rupiah_totals_consistently(
        string $orderType,
        array $expected,
    ): void {
        $totals = (new TransactionTotalCalculator)->calculate(
            subtotal: 9_999,
            discount: 333,
            taxRatePercent: 10,
            serviceChargeRatePercent: 5,
            orderType: $orderType,
        );

        $this->assertSame($expected, $totals);
    }

    public static function totalCases(): array
    {
        return [
            'dine-in includes service charge' => ['dine_in', [
                'subtotal' => 9_999.0,
                'discount' => 333.0,
                'service_charge' => 483.0,
                'tax' => 1_015.0,
                'total_amount' => 11_164.0,
            ]],
            'takeaway excludes service charge' => ['takeaway', [
                'subtotal' => 9_999.0,
                'discount' => 333.0,
                'service_charge' => 0,
                'tax' => 967.0,
                'total_amount' => 10_633.0,
            ]],
        ];
    }

    public function test_it_rejects_a_discount_above_the_subtotal(): void
    {
        $this->expectException(InvalidArgumentException::class);

        (new TransactionTotalCalculator)->calculate(10_000, 10_001, 10, 5, 'dine_in');
    }
}
