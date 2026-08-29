<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MidtransController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\ShiftController;
use App\Http\Controllers\StaffController;
use App\Http\Controllers\TableController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

// Midtrans Webhook (No Auth Required)
Route::post('/midtrans/webhook', [MidtransController::class, 'webhook']);

// Authentication Routes
Route::post('/login', [AuthController::class, 'login']);

// Protected API Routes
Route::middleware('auth:sanctum')->group(function () {
    // ---- Open for Both Admin & Cashier ----
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);

    // Shifts
    Route::get('/shifts', [ShiftController::class, 'index']);
    Route::get('/shifts/current', [ShiftController::class, 'current']);
    Route::post('/shifts/open', [ShiftController::class, 'open']);
    Route::post('/shifts/close', [ShiftController::class, 'close']);

    // Products, Categories, Customers (Read-only or accessible for POS)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/settings', [SettingController::class, 'show']);
    Route::get('/tables', [TableController::class, 'index']);
    Route::apiResource('customers', CustomerController::class);

    // Transactions
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);
    Route::post('/transactions/{id}/cancel-pending-qris', [TransactionController::class, 'cancelPendingQris']);

    // QRIS
    Route::post('/qris/generate', [MidtransController::class, 'generateQris']);
    Route::get('/qris/status/{order_id}', [MidtransController::class, 'checkStatus']);

    // ---- Admin Only Routes ----
    Route::middleware('role:admin')->group(function () {
        // Dashboard & Reports
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/reports', [ReportController::class, 'index']);
        Route::get('/reports/export', [ReportController::class, 'export']);

        // Settings
        Route::put('/settings', [SettingController::class, 'update']);
        Route::apiResource('tables', TableController::class)->except(['index']);

        // Staff & Roles
        Route::get('/staff', [StaffController::class, 'index']);
        Route::post('/staff', [StaffController::class, 'store']);
        Route::put('/staff/{id}', [StaffController::class, 'update']);
        Route::get('/roles', [RoleController::class, 'index']);

        // Products & Categories (Create, Update, Delete)
        Route::apiResource('categories', CategoryController::class)->except(['index']);
        Route::apiResource('products', ProductController::class)->except(['index']);

        // Inventory
        Route::get('/inventory/movements', [InventoryController::class, 'movements']);
        Route::post('/inventory/restock', [InventoryController::class, 'restock']);

        // Transaction Void
        Route::post('/transactions/{id}/void', [TransactionController::class, 'voidTransaction']);
    });
});
