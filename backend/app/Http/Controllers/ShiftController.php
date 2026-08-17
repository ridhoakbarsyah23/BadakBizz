<?php

namespace App\Http\Controllers;

use App\Models\CashierShift;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ShiftController extends Controller
{
    /**
     * Get all shifts for reporting
     */
    public function index()
    {
        $shifts = CashierShift::with('user')->orderBy('created_at', 'desc')->get();

        $shifts->each(function($shift) {
            $cashTransactions = $shift->transactions()
                ->where('payment_method', 'CASH')
                ->where('status', 'COMPLETED')
                ->sum('payment_amount'); // wait, the expected cash should be based on total_amount or payment_amount? It should be total_amount of the transaction if fully paid by cash, wait, payment_amount might include change. Usually it's total_amount for the sale if paid in cash.
            
            // Wait, let's just sum `total_amount` where payment_method is CASH
            $cashSales = $shift->transactions()
                ->where('payment_method', 'CASH')
                ->where('status', 'COMPLETED')
                ->sum('total_amount');
            
            $shift->expected_cash = $shift->starting_cash + $cashSales;
            
            if ($shift->status === 'closed') {
                $shift->discrepancy = $shift->ending_cash - $shift->expected_cash;
            } else {
                $shift->discrepancy = null;
            }
        });

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

        return response()->json(['shift' => $shift]);
    }

    /**
     * Open a new shift
     */
    public function open(Request $request)
    {
        $request->validate([
            'starting_cash' => 'nullable|numeric|min:0'
        ]);

        // Check if there is already an open shift
        $existingShift = CashierShift::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if ($existingShift) {
            return response()->json([
                'message' => 'You already have an open shift.',
                'shift' => $existingShift
            ], 400);
        }

        $shift = CashierShift::create([
            'user_id' => $request->user()->id,
            'start_time' => now(),
            'starting_cash' => $request->starting_cash ?? 0,
            'status' => 'open'
        ]);

        return response()->json([
            'message' => 'Shift opened successfully',
            'shift' => $shift
        ], 201);
    }

    /**
     * Close the current shift
     */
    public function close(Request $request)
    {
        $request->validate([
            'ending_cash' => 'required|numeric|min:0'
        ]);

        $shift = CashierShift::where('user_id', $request->user()->id)
            ->where('status', 'open')
            ->first();

        if (!$shift) {
            return response()->json([
                'message' => 'No open shift found.'
            ], 404);
        }

        $shift->update([
            'end_time' => now(),
            'ending_cash' => $request->ending_cash,
            'status' => 'closed'
        ]);

        return response()->json([
            'message' => 'Shift closed successfully',
            'shift' => $shift
        ]);
    }
}
