<?php

use App\Http\Controllers\MercadoLivre\MercadoLivreAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('auth/mercadolivre/callback', [MercadoLivreAuthController::class, 'callback']);
