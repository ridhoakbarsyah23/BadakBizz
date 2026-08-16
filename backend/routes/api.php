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

// Authentication Routes
Route::post('/login', [AuthController::class, 'login']);

use App\Http\Controllers\ReportController;

// Protected API Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Reports endpoint
    Route::get('/reports', [ReportController::class, 'index']);

    // Staff Management endpoints
    Route::get('/staff', [\App\Http\Controllers\StaffController::class, 'index']);
    Route::post('/staff', [\App\Http\Controllers\StaffController::class, 'store']);
    Route::put('/staff/{id}', [\App\Http\Controllers\StaffController::class, 'update']);

    // Transactions endpoint
    Route::post('/transactions', [TransactionController::class, 'store']);
});

// For easier dev during frontend integration, we leave these routes unprotected for now.
// Or we can protect them all. But for now, we leave them open to avoid breaking existing frontend code 
// that doesn't send the Bearer token yet. We'll protect them once frontend is fully ready.

Route::get('/products', [ProductController::class, 'index']);
Route::get('/categories', [CategoryController::class, 'index']);
Route::get('/transactions', [TransactionController::class, 'index']);
Route::apiResource('categories', CategoryController::class);
Route::apiResource('products', ProductController::class);
Route::apiResource('customers', CustomerController::class);

Route::get('/inventory/movements', [InventoryController::class, 'movements']);
Route::post('/inventory/restock', [InventoryController::class, 'restock']);

Route::get('/transactions', [TransactionController::class, 'index']);

Route::get('/dashboard', [DashboardController::class, 'index']);
