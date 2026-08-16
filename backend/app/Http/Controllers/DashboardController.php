<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Transaction;
use App\Models\Product;
use App\Models\Customer;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function index()
    {
        $today = Carbon::today();
        $startOfWeek = Carbon::now()->subDays(6)->startOfDay();
        
        // 1. Total Revenue Today
        $revenueToday = Transaction::whereDate('created_at', $today)->sum('total_amount');
        
        // 2. Total Transactions Today
        $transactionsToday = Transaction::whereDate('created_at', $today)->count();
        
        // 3. Total Customers
        $totalCustomers = Customer::count();

        // 4. Low Stock Products
        $lowStockProducts = Product::whereColumn('stock', '<=', 'minimum_stock')->get();

        // 5. Sales Trend (Last 7 Days)
        $salesTrend = Transaction::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(total_amount) as revenue'),
            DB::raw('COUNT(*) as transactions')
        )
        ->where('created_at', '>=', $startOfWeek)
        ->groupBy('date')
        ->orderBy('date', 'ASC')
        ->get();

        // Fill in missing days with 0
        $trendData = [];
        for ($i = 0; $i < 7; $i++) {
            $dateStr = Carbon::now()->subDays(6 - $i)->format('Y-m-d');
            $dayData = $salesTrend->firstWhere('date', $dateStr);
            
            $trendData[] = [
                'date' => Carbon::parse($dateStr)->format('d M'),
                'revenue' => $dayData ? (float) $dayData->revenue : 0,
                'transactions' => $dayData ? (int) $dayData->transactions : 0,
            ];
        }

        // 6. Top 5 Selling Products
        $topProducts = DB::table('transaction_items')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->select('products.name', DB::raw('SUM(transaction_items.quantity) as total_sold'))
            ->groupBy('products.id', 'products.name')
            ->orderBy('total_sold', 'DESC')
            ->limit(5)
            ->get();

        return response()->json([
            'revenueToday' => $revenueToday,
            'transactionsToday' => $transactionsToday,
            'totalCustomers' => $totalCustomers,
            'lowStockProducts' => $lowStockProducts,
            'salesTrend' => $trendData,
            'topProducts' => $topProducts
        ]);
    }
}
