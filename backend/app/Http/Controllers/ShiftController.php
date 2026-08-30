<?php

namespace App\Http\Controllers;

use App\Models\CashierShift;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    /**
     * Get all shifts for reporting
     */
    public function index(Request $request)
    {
        $query = CashierShift::with('user')->orderBy('created_at', 'desc');

        if ($request->user()->role?->slug !== 'admin') {
            $query->where('user_id', $request->user()->id);
        }

        $shifts = $query->get()->map(fn (CashierShift $shift) => $this->withShiftSummary($shift));

        return response()->json($shifts);
    }

    /**
     * Get the current active shift for the authenticated user
     */
    public function current(Request $request)
    {
        $shift = CashierShift::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        return response()->json([
            'shift' => $shift ? $this->withShiftSummary($shift->load('user')) : null,
        ]);
    }

    /**
     * Open a new shift
     */
    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'nullable|numeric|min:0',
        ]);

        // Check if there is already an open shift
        $existingShift = CashierShift::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if ($existingShift) {
            return response()->json([
                'message' => 'You already have an open shift.',
                'shift' => $existingShift,
            ], 400);
        }

        $shift = CashierShift::create([
            'user_id' => $request->user()->id,
            'start_time' => now(),
            'starting_cash' => $request->starting_cash ?? 0,
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Shift opened successfully',
            'shift' => $this->withShiftSummary($shift->load('user')),
        ], 201);
    }

    /**
     * Close the current shift
     */
    public function close(Request $request)
    {
        $request->validate([
            'ending_cash' => 'required|numeric|min:0',
        ]);

        $shift = CashierShift::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if (! $shift) {
            return response()->json([
                'message' => 'No open shift found.',
            ], 404);
        }

        $shift->update([
            'end_time' => now(),
            'ending_cash' => $request->ending_cash,
            'status' => 'closed',
        ]);

        return response()->json([
            'message' => 'Shift closed successfully',
            'shift' => $this->withShiftSummary($shift->fresh('user')),
        ]);
    }

    private function withShiftSummary(CashierShift $shift): CashierShift
    {
        $completedTransactions = $shift->transactions()
            ->where('status', 'COMPLETED');

        $cashSales = (float) (clone $completedTransactions)
            ->where('payment_method', 'CASH')
            ->sum('total_amount');

        $totalSales = (float) (clone $completedTransactions)->sum('total_amount');
        $transactionCount = (clone $completedTransactions)->count();
        $expectedCash = (float) $shift->starting_cash + $cashSales;

        $shift->cash_sales = $cashSales;
        $shift->total_sales = $totalSales;
        $shift->transaction_count = $transactionCount;
        $shift->expected_cash = $expectedCash;
        $shift->duration_minutes = $shift->start_time
            ? (int) $shift->start_time->diffInMinutes($shift->end_time ?? now())
            : 0;
        $shift->discrepancy = $shift->status === 'closed'
            ? (float) $shift->ending_cash - $expectedCash
            : null;

        return $shift;
    }
}
