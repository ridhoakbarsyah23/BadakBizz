<?php

namespace App\Services;

use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Transaction;
use Illuminate\Support\Facades\DB;

class TransactionStatusService
{
    public function complete(Transaction $transaction): Transaction
    {
        return DB::transaction(function () use ($transaction) {
            $lockedTransaction = Transaction::with('customer')
                ->lockForUpdate()
                ->findOrFail($transaction->id);

            if ($lockedTransaction->status === 'COMPLETED') {
                $this->releaseTable($lockedTransaction);

                return $lockedTransaction;
            }

            if ($lockedTransaction->status === 'CANCELLED') {
                return $lockedTransaction;
            }

            $lockedTransaction->update(['status' => 'COMPLETED']);
            $this->releaseTable($lockedTransaction);
            $this->incrementCustomerTotals($lockedTransaction);

            return $lockedTransaction->fresh(['items.product', 'items.variant', 'customer', 'cashier']);
        });
    }

    public function cancel(Transaction $transaction, ?int $userId = null, string $notesPrefix = 'Cancelled Transaction'): Transaction
    {
        return DB::transaction(function () use ($transaction, $userId, $notesPrefix) {
            $lockedTransaction = Transaction::with(['items.product', 'items.variant', 'customer'])
                ->lockForUpdate()
                ->findOrFail($transaction->id);

            if ($lockedTransaction->status === 'CANCELLED') {
                return $lockedTransaction;
            }

            $wasCompleted = $lockedTransaction->status === 'COMPLETED';

            foreach ($lockedTransaction->items as $item) {
                if (! $item->product) {
                    continue;
                }

                if ($item->variant) {
                    $item->variant->increment('stock', $item->quantity);
                } else {
                    $item->product->increment('stock', $item->quantity);
                }

                InventoryMovement::create([
                    'product_id' => $item->product_id,
                    'variant_id' => $item->variant_id,
                    'type' => 'IN',
                    'quantity' => $item->quantity,
                    'notes' => $notesPrefix.' '.$lockedTransaction->transaction_number.($item->variant ? ' - '.$item->variant->name : ''),
                    'user_id' => $userId,
                ]);
            }

            if ($wasCompleted) {
                $this->decrementCustomerTotals($lockedTransaction);
            }

            $lockedTransaction->update(['status' => 'CANCELLED']);
            $this->releaseTable($lockedTransaction);

            return $lockedTransaction->fresh(['items.product', 'items.variant', 'customer', 'cashier']);
        });
    }

    public function incrementCustomerTotals(Transaction $transaction): void
    {
        if (! $transaction->customer_id) {
            return;
        }

        $customer = Customer::lockForUpdate()->find($transaction->customer_id);
        if (! $customer) {
            return;
        }

        $customer->increment('total_transactions');
        $customer->increment('total_spending', $transaction->total_amount);
    }

    private function decrementCustomerTotals(Transaction $transaction): void
    {
        if (! $transaction->customer_id) {
            return;
        }

        $customer = Customer::lockForUpdate()->find($transaction->customer_id);
        if (! $customer) {
            return;
        }

        $customer->update([
            'total_transactions' => max(0, $customer->total_transactions - 1),
            'total_spending' => max(0, (float) $customer->total_spending - (float) $transaction->total_amount),
        ]);
    }

    private function releaseTable(Transaction $transaction): void
    {
        if (! $transaction->table_id) {
            return;
        }

        $transaction->table()->update(['status' => 'available']);
    }
}
