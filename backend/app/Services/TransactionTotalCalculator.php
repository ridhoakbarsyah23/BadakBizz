<?php

namespace App\Services;

use InvalidArgumentException;

class TransactionTotalCalculator
{
    public function calculate(
        float $subtotal,
        float $discount,
        float $taxRatePercent,
        float $serviceChargeRatePercent,
        string $orderType,
    ): array {
        $roundedSubtotal = round($subtotal, 0, PHP_ROUND_HALF_UP);
        $roundedDiscount = round($discount, 0, PHP_ROUND_HALF_UP);

        if ($roundedDiscount > $roundedSubtotal) {
            throw new InvalidArgumentException('Discount cannot be greater than subtotal.');
        }

        $netAfterDiscount = $roundedSubtotal - $roundedDiscount;
        $serviceCharge = $orderType === 'dine_in'
            ? round($netAfterDiscount * ($serviceChargeRatePercent / 100), 0, PHP_ROUND_HALF_UP)
            : 0;
        $tax = round(
            ($netAfterDiscount + $serviceCharge) * ($taxRatePercent / 100),
            0,
            PHP_ROUND_HALF_UP,
        );

        return [
            'subtotal' => $roundedSubtotal,
            'discount' => $roundedDiscount,
            'service_charge' => $serviceCharge,
            'tax' => $tax,
            'total_amount' => $netAfterDiscount + $serviceCharge + $tax,
        ];
    }
}
