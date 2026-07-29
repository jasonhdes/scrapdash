<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Login/registro/Google não tinham NENHUM rate limit — endpoint de
        // login sem isso é convite a força bruta de senha. Mais restrito que
        // o resto da API porque aqui o custo de um request malicioso é maior
        // (tentativa de credencial) e o volume legítimo é bem menor.
        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(10)->by($request->ip());
        });

        // Resto da API autenticada: limite por usuário (não por IP), já que
        // várias contas podem estar atrás do mesmo IP (rede da empresa) e o
        // scheduler/dashboard fazem polling legítimo com frequência.
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(120)->by($request->user()?->id ?: $request->ip());
        });
    }
}
