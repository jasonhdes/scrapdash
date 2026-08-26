<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\FinancialController;
use App\Http\Controllers\MercadoLivre\MercadoLivreAuthController;
use App\Http\Controllers\MercadoLivre\MercadoLivreSyncController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderReturnController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\PurchaseController;
use App\Http\Controllers\ReportController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:auth')->group(function () {
        Route::post('register', [AuthController::class, 'register']);
        Route::post('login', [AuthController::class, 'login']);
        Route::post('google', [GoogleAuthController::class, 'login']);
    });

    Route::middleware(['auth:api', 'throttle:api'])->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::middleware(['auth:api', 'throttle:api'])->group(function () {
    Route::get('accounts', [AccountController::class, 'index']);
    Route::post('accounts/{account}/mercadolivre/connect', [MercadoLivreAuthController::class, 'connect']);
    Route::post('accounts/{account}/mercadolivre/sync', [MercadoLivreSyncController::class, 'trigger']);
    Route::post('accounts/{account}/mercadolivre/import-history', [MercadoLivreSyncController::class, 'importHistory']);
    Route::get('accounts/{account}/dashboard', [DashboardController::class, 'show']);
    Route::get('accounts/{account}/dashboard/revenue-series', [DashboardController::class, 'revenueSeries']);
    Route::get('accounts/{account}/dashboard/customers-by-state', [DashboardController::class, 'customersByState']);

    Route::get('accounts/{account}/products', [ProductController::class, 'index']);
    Route::post('accounts/{account}/products/refresh-prices', [ProductController::class, 'refreshPrices']);
    Route::get('accounts/{account}/products/{product}', [ProductController::class, 'show']);

    Route::get('accounts/{account}/orders/export', [OrderController::class, 'export']);
    Route::get('accounts/{account}/orders/sku-options', [OrderController::class, 'skuOptions']);
    Route::get('accounts/{account}/orders', [OrderController::class, 'index']);
    Route::get('accounts/{account}/orders/{order}', [OrderController::class, 'show']);
    Route::patch('accounts/{account}/orders/{order}/processed', [OrderController::class, 'markProcessed']);

    Route::get('accounts/{account}/messages', [MessageController::class, 'index']);
    Route::get('accounts/{account}/orders/{order}/messages', [MessageController::class, 'show']);
    Route::post('accounts/{account}/orders/{order}/messages', [MessageController::class, 'reply']);

    Route::get('accounts/{account}/payments', [PaymentController::class, 'index']);
    Route::get('accounts/{account}/financial/summary', [FinancialController::class, 'summary']);
    Route::get('accounts/{account}/financial/balance', [FinancialController::class, 'balance']);
    Route::patch('accounts/{account}/financial/balance-seed', [FinancialController::class, 'updateBalanceSeed']);
    Route::post('accounts/{account}/financial/validate', [FinancialController::class, 'markValidated']);

    Route::get('accounts/{account}/reports/movements', [ReportController::class, 'movements']);
    Route::get('accounts/{account}/reports/monthly', [ReportController::class, 'monthly']);

    Route::get('accounts/{account}/returns', [OrderReturnController::class, 'index']);
    Route::get('accounts/{account}/returns/summary', [OrderReturnController::class, 'summary']);
    Route::post('accounts/{account}/returns/sync', [OrderReturnController::class, 'sync']);
    Route::post('accounts/{account}/returns', [OrderReturnController::class, 'store']);
    Route::patch('accounts/{account}/returns/{return}', [OrderReturnController::class, 'update']);
    Route::delete('accounts/{account}/returns/{return}', [OrderReturnController::class, 'destroy']);

    Route::get('accounts/{account}/purchases', [PurchaseController::class, 'index']);
    Route::post('accounts/{account}/purchases', [PurchaseController::class, 'store']);
    Route::delete('accounts/{account}/purchases/{purchase}', [PurchaseController::class, 'destroy']);

    Route::get('accounts/{account}/employees', [EmployeeController::class, 'index']);
    Route::post('accounts/{account}/employees', [EmployeeController::class, 'store']);
    Route::patch('accounts/{account}/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('accounts/{account}/employees/{employee}', [EmployeeController::class, 'destroy']);
});
