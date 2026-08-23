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
        $startDateStr = $request->query('start_date');
        $endDateStr = $request->query('end_date');

        if ($startDateStr && $endDateStr) {
            $startDate = Carbon::parse($startDateStr)->startOfDay();
            $endDate = Carbon::parse($endDateStr)->endOfDay();
        } else {
            // Default to Year-to-Date if no dates provided
            $startDate = Carbon::now()->startOfYear();
            $endDate = Carbon::now()->endOfDay();
        }

        // 1. Total Revenue
        $totalRevenue = Transaction::whereBetween('created_at', [$startDate, $endDate])->sum('total_amount');

        // 2. Average Transaction
        $averageTransaction = Transaction::whereBetween('created_at', [$startDate, $endDate])->avg('total_amount') ?? 0;

        // 3. Top Selling Item
        $topSellingItem = DB::table('transaction_items')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->whereBetween('transactions.created_at', [$startDate, $endDate])
            ->select('products.name', DB::raw('SUM(transaction_items.quantity) as total_sold'))
            ->groupBy('products.id', 'products.name')
            ->orderBy('total_sold', 'DESC')
            ->first();

        // 4. Busiest Hour
        $transactionsTime = Transaction::select('created_at')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();
            
        $busiestHourData = $transactionsTime->groupBy(function ($date) {
            return Carbon::parse($date->created_at)->format('H');
        })->map(function ($row) {
            return $row->count();
        })->sortDesc()->keys()->first();

        $busiestHour = $busiestHourData ? $busiestHourData . ':00 - ' . str_pad((int)$busiestHourData + 1, 2, '0', STR_PAD_LEFT) . ':00' : 'N/A';

        // 5. Chart Data
        $diffInDays = $startDate->diffInDays($endDate);
        
        $chartTransactions = Transaction::with('items.product')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $chartData = collect([]);

        if ($diffInDays <= 31) {
            // Daily Chart
            $period = \Carbon\CarbonPeriod::create($startDate, $endDate);
            foreach ($period as $date) {
                $dateKey = $date->format('Y-m-d');
                $dateLabel = $date->format('d M');
                
                $txsInDay = $chartTransactions->filter(function($t) use ($dateKey) {
                    return Carbon::parse($t->created_at)->format('Y-m-d') === $dateKey;
                });
                
                $sales = $txsInDay->sum('total_amount');
                $profit = 0;
                foreach ($txsInDay as $tx) {
                    foreach ($tx->items as $item) {
                        $purchasePrice = $item->product ? $item->product->purchase_price : 0;
                        $profit += ($item->price - $purchasePrice) * $item->quantity;
                    }
                }
                
                $chartData->push([
                    'label' => $dateLabel,
                    'sales' => $sales,
                    'profit' => $profit
                ]);
            }
        } else {
            // Monthly Chart
            $period = \Carbon\CarbonPeriod::create($startDate->copy()->startOfMonth(), '1 month', $endDate->copy()->startOfMonth());
            foreach ($period as $date) {
                $monthKey = $date->format('Y-m');
                $monthLabel = $date->format('M Y');
                
                $txsInMonth = $chartTransactions->filter(function($t) use ($monthKey) {
                    return Carbon::parse($t->created_at)->format('Y-m') === $monthKey;
                });
                
                $sales = $txsInMonth->sum('total_amount');
                $profit = 0;
                foreach ($txsInMonth as $tx) {
                    foreach ($tx->items as $item) {
                        $purchasePrice = $item->product ? $item->product->purchase_price : 0;
                        $profit += ($item->price - $purchasePrice) * $item->quantity;
                    }
                }
                
                $chartData->push([
                    'label' => $monthLabel,
                    'sales' => $sales,
                    'profit' => $profit
                ]);
            }
        }

        return response()->json([
            'totalRevenue' => $totalRevenue,
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
