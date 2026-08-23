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

    public function export(Request $request)
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

        $transactions = Transaction::with('items.product', 'customer', 'cashier')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->orderBy('created_at', 'ASC')
            ->get();

        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=KivoPOS_Report_" . $startDate->format('Ymd') . "_to_" . $endDate->format('Ymd') . ".csv",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = [
            'Date', 'Transaction Number', 'Cashier', 'Customer', 'Payment Method',
            'Subtotal', 'Discount', 'Tax', 'Service Charge', 'Total Amount', 'Status'
        ];

        $callback = function() use($transactions, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($transactions as $tx) {
                $row = [
                    $tx->created_at->format('Y-m-d H:i:s'),
                    $tx->transaction_number,
                    $tx->cashier ? $tx->cashier->name : 'N/A',
                    $tx->customer ? $tx->customer->name : 'Walk-in',
                    $tx->payment_method,
                    $tx->subtotal,
                    $tx->discount,
                    $tx->tax,
                    $tx->service_charge,
                    $tx->total_amount,
                    $tx->status,
                ];
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
