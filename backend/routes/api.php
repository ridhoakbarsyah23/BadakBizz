<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\ReportController;

// Authentication Routes
Route::post('/login', [AuthController::class, 'login']);

// Protected API Routes
Route::middleware('auth:sanctum')->group(function () {
    // ---- Open for Both Admin & Cashier ----
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Shifts
    Route::get('/shifts', [\App\Http\Controllers\ShiftController::class, 'index']);
    Route::get('/shifts/current', [\App\Http\Controllers\ShiftController::class, 'current']);
    Route::post('/shifts/open', [\App\Http\Controllers\ShiftController::class, 'open']);
    Route::post('/shifts/close', [\App\Http\Controllers\ShiftController::class, 'close']);

    // Products, Categories, Customers (Read-only or accessible for POS)
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::apiResource('customers', CustomerController::class);

    // Transactions
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);

    // ---- Admin Only Routes ----
    Route::middleware('role:admin')->group(function () {
        // Dashboard & Reports
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/reports', [ReportController::class, 'index']);
        Route::get('/reports/export', [ReportController::class, 'export']);
        
        // Settings
        Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'show']);
        Route::put('/settings', [\App\Http\Controllers\SettingController::class, 'update']);
        
        // Staff & Roles
        Route::get('/staff', [\App\Http\Controllers\StaffController::class, 'index']);
        Route::post('/staff', [\App\Http\Controllers\StaffController::class, 'store']);
        Route::put('/staff/{id}', [\App\Http\Controllers\StaffController::class, 'update']);
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
