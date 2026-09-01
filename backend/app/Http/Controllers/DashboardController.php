<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Product;
use App\Models\Transaction;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $filter = $request->query('filter', 'today'); // today, week, month

        $today = Carbon::today();

        $startDate = $today;
        $trendDays = 7; // Default for chart

        if ($filter === 'week') {
            $startDate = Carbon::now()->subDays(6)->startOfDay();
        } elseif ($filter === 'month') {
            $startDate = Carbon::now()->subDays(29)->startOfDay();
            $trendDays = 30;
        }

        // 1. Total Revenue
        $revenueQuery = Transaction::where('status', 'COMPLETED');
        if ($filter === 'today') {
            $revenueQuery->whereDate('created_at', $today);
        } else {
            $revenueQuery->where('created_at', '>=', $startDate);
        }
        $revenue = $revenueQuery->sum('total_amount');

        // 2. Total Transactions
        $transactionsQuery = Transaction::where('status', 'COMPLETED');
        if ($filter === 'today') {
            $transactionsQuery->whereDate('created_at', $today);
        } else {
            $transactionsQuery->where('created_at', '>=', $startDate);
        }
        $transactions = $transactionsQuery->count();

        // 3. Total Customers
        $totalCustomers = Customer::count();

        // 4. Low Stock Products
        $lowStockProducts = Product::with('variants')
            ->get()
            ->filter(function (Product $product) {
                $stock = $product->has_variants
                    ? $product->variants->sum('stock')
                    : $product->stock;

                return $stock <= $product->minimum_stock;
            })
            ->values();

        // 5. Sales Trend (Chart)
        // If filter is today, we still show the last 7 days trend to give context.
        // If month, we show 30 days.
        $chartStartDate = $filter === 'month' ? $startDate : Carbon::now()->subDays(6)->startOfDay();
        $chartDays = $filter === 'month' ? 30 : 7;

        $salesTrend = Transaction::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(total_amount) as revenue'),
            DB::raw('COUNT(*) as transactions')
        )
            ->where('status', 'COMPLETED')
            ->where('created_at', '>=', $chartStartDate)
            ->groupBy('date')
            ->orderBy('date', 'ASC')
            ->get();

        // Fill in missing days with 0
        $trendData = [];
        for ($i = 0; $i < $chartDays; $i++) {
            $dateStr = Carbon::now()->subDays($chartDays - 1 - $i)->format('Y-m-d');
            $dayData = $salesTrend->firstWhere('date', $dateStr);

            $trendData[] = [
                'date' => Carbon::parse($dateStr)->format('d M'),
                'revenue' => $dayData ? (float) $dayData->revenue : 0,
                'transactions' => $dayData ? (int) $dayData->transactions : 0,
            ];
        }

        // 6. Top 5 Selling Products (based on filter)
        $topProductsQuery = DB::table('transaction_items')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'COMPLETED')
            ->select('products.name', DB::raw('SUM(transaction_items.quantity) as total_sold'));

        if ($filter === 'today') {
            $topProductsQuery->whereDate('transactions.created_at', $today);
        } else {
            $topProductsQuery->where('transactions.created_at', '>=', $startDate);
        }

        $topProducts = $topProductsQuery->groupBy('products.id', 'products.name')
            ->orderBy('total_sold', 'DESC')
            ->limit(5)
            ->get();

        return response()->json([
            'revenueToday' => $revenue, // keeping same variable name for frontend compatibility
            'transactionsToday' => $transactions,
            'totalCustomers' => $totalCustomers,
            'lowStockProducts' => $lowStockProducts,
            'salesTrend' => $trendData,
            'topProducts' => $topProducts,
            'filter' => $filter,
        ]);
    }
}
