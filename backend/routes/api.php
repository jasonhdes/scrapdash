<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\FinancialController;
use App\Http\Controllers\MercadoLivre\MercadoLivreAuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
    Route::post('google', [GoogleAuthController::class, 'login']);

    Route::middleware('auth:api')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('refresh', [AuthController::class, 'refresh']);
        Route::post('logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:api')->group(function () {
    Route::get('accounts', [AccountController::class, 'index']);
    Route::post('accounts/{account}/mercadolivre/connect', [MercadoLivreAuthController::class, 'connect']);
    Route::get('accounts/{account}/dashboard', [DashboardController::class, 'show']);

    Route::get('accounts/{account}/products', [ProductController::class, 'index']);
    Route::get('accounts/{account}/products/{product}', [ProductController::class, 'show']);

    Route::get('accounts/{account}/orders/export', [OrderController::class, 'export']);
    Route::get('accounts/{account}/orders', [OrderController::class, 'index']);
    Route::get('accounts/{account}/orders/{order}', [OrderController::class, 'show']);
    Route::patch('accounts/{account}/orders/{order}/processed', [OrderController::class, 'markProcessed']);

    Route::get('accounts/{account}/payments', [PaymentController::class, 'index']);
    Route::get('accounts/{account}/financial/summary', [FinancialController::class, 'summary']);
    Route::get('accounts/{account}/financial/reconciliation', [FinancialController::class, 'reconciliation']);
});
