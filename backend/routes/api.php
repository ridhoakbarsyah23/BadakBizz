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

// Authentication Routes
Route::post('/login', [AuthController::class, 'login']);

use App\Http\Controllers\ReportController;

// Protected API Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Roles
    Route::get('/roles', [RoleController::class, 'index']);

    // Shifts
    Route::get('/shifts', [\App\Http\Controllers\ShiftController::class, 'index']);
    Route::get('/shifts/current', [\App\Http\Controllers\ShiftController::class, 'current']);
    Route::post('/shifts/open', [\App\Http\Controllers\ShiftController::class, 'open']);
    Route::post('/shifts/close', [\App\Http\Controllers\ShiftController::class, 'close']);

    // Reports endpoint
    Route::get('/reports', [ReportController::class, 'index']);

    // Settings endpoints
    Route::get('/settings', [\App\Http\Controllers\SettingController::class, 'show']);
    Route::put('/settings', [\App\Http\Controllers\SettingController::class, 'update']);
    Route::get('/staff', [\App\Http\Controllers\StaffController::class, 'index']);
    Route::post('/staff', [\App\Http\Controllers\StaffController::class, 'store']);
    Route::put('/staff/{id}', [\App\Http\Controllers\StaffController::class, 'update']);

    // Product & Categories endpoints
    Route::get('/products', [ProductController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('customers', CustomerController::class);

    // Inventory
    Route::get('/inventory/movements', [InventoryController::class, 'movements']);
    Route::post('/inventory/restock', [InventoryController::class, 'restock']);

    // Transactions endpoint
    Route::get('/transactions', [TransactionController::class, 'index']);
    Route::post('/transactions', [TransactionController::class, 'store']);

    // Dashboard
    Route::get('/dashboard', [DashboardController::class, 'index']);
});
