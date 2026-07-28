<?php

use App\Jobs\CleanupJob;
use App\Jobs\RefreshTokenJob;
use App\Jobs\SyncMessagesJob;
use App\Jobs\SyncOrderAddressesJob;
use App\Jobs\SyncOrdersJob;
use App\Jobs\SyncPaymentReleaseDatesJob;
use App\Jobs\SyncProductsJob;
use App\Models\Account;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    Account::query()
        ->whereNotNull('mercadolivre_access_token')
        ->whereNotNull('mercadolivre_refresh_token')
        ->get()
        ->each(function (Account $account) {
            if ($account->mercadoLivreTokenExpiresSoon()) {
                RefreshTokenJob::dispatch($account);
            }
        });
})->everyFiveMinutes()->name('mercadolivre:refresh-tokens')->withoutOverlapping();

Schedule::call(function () {
    Account::query()->whereNotNull('mercadolivre_access_token')->get()->each(function (Account $account) {
        SyncProductsJob::dispatch($account);
        SyncOrdersJob::dispatch($account);
        SyncMessagesJob::dispatch($account);
        SyncPaymentReleaseDatesJob::dispatch($account);
        SyncOrderAddressesJob::dispatch($account);
    });
})->everyFifteenMinutes()->name('mercadolivre:sync-data')->withoutOverlapping();

Schedule::job(new CleanupJob)->daily()->name('mercadolivre:cleanup');
