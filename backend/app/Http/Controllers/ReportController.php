<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\TransactionItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $currentYear = Carbon::now()->year;

        // 1. Total Revenue YTD
        $totalRevenueYTD = Transaction::whereYear('created_at', $currentYear)->sum('total_amount');

        // 2. Average Transaction
        $averageTransaction = Transaction::whereYear('created_at', $currentYear)->avg('total_amount') ?? 0;

        // 3. Top Selling Item
        $topSellingItem = DB::table('transaction_items')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->select('products.name', DB::raw('SUM(transaction_items.quantity) as total_sold'))
            ->groupBy('products.id', 'products.name')
            ->orderBy('total_sold', 'DESC')
            ->first();

        // 4. Busiest Hour
        // Using SQLite strftime since local env is typically SQLite if not specified otherwise.
        // If it's MySQL, it would be HOUR(created_at). Let's use generic SQL if possible or handle both.
        // A safer cross-database way is to fetch recent transactions and group in collection, 
        // but for a small scale DB, we can do raw. Let's use collection grouping for max compatibility.
        $transactionsTime = Transaction::select('created_at')->get();
        $busiestHourData = $transactionsTime->groupBy(function ($date) {
            return Carbon::parse($date->created_at)->format('H'); // get hour
        })->map(function ($row) {
            return $row->count();
        })->sortDesc()->first() ? $transactionsTime->groupBy(function ($date) {
            return Carbon::parse($date->created_at)->format('H');
        })->map(function ($row) {
            return $row->count();
        })->sortDesc()->keys()->first() : null;

        $busiestHour = $busiestHourData ? $busiestHourData . ':00 - ' . str_pad((int)$busiestHourData + 1, 2, '0', STR_PAD_LEFT) . ':00' : 'N/A';

        // 5. Sales vs Profit (6 Months)
        $sixMonthsAgo = Carbon::now()->subMonths(5)->startOfMonth();
        
        $monthlyDataRaw = DB::table('transactions')
            ->select(
                DB::raw('strftime("%m-%Y", created_at) as month_year'), // SQLite specific, but let's do collection grouping for safety
                'id', 'total_amount', 'created_at'
            )
            ->where('created_at', '>=', $sixMonthsAgo)
            ->get();

        // Let's do collection grouping to avoid SQLite/MySQL differences
        $monthlyTransactions = Transaction::with('items.product')
            ->where('created_at', '>=', $sixMonthsAgo)
            ->get();

        $chartData = collect([]);
        
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $monthStr = $month->format('M'); // e.g. "Jan", "Feb"
            $monthKey = $month->format('Y-m');

            $txsInMonth = $monthlyTransactions->filter(function($t) use ($monthKey) {
                return Carbon::parse($t->created_at)->format('Y-m') === $monthKey;
            });

            $sales = $txsInMonth->sum('total_amount');
            
            // Calculate profit
            $profit = 0;
            foreach ($txsInMonth as $tx) {
                foreach ($tx->items as $item) {
                    $purchasePrice = $item->product ? $item->product->purchase_price : 0;
                    $profit += ($item->price - $purchasePrice) * $item->quantity;
                }
            }

            $chartData->push([
                'month' => $monthStr,
                'sales' => $sales,
                'profit' => $profit
            ]);
        }

        return response()->json([
            'totalRevenueYTD' => $totalRevenueYTD,
            'averageTransaction' => $averageTransaction,
            'topSellingItem' => $topSellingItem ? [
                'name' => $topSellingItem->name,
                'sold' => $topSellingItem->total_sold
            ] : null,
            'busiestHour' => $busiestHour,
            'chartData' => $chartData
        ]);
    }
}
