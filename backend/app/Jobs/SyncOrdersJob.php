<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Order;
use App\Models\SyncLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncOrdersJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(private readonly Account $account) {}

    public function handle(MercadoLivreService $mercadoLivre): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_ORDERS, function () use ($mercadoLivre) {
            $orders = $mercadoLivre->searchOrders($this->account);

            foreach ($orders as $orderData) {
                Order::updateOrCreate(
                    ['mercadolivre_order_id' => (string) $orderData['id']],
                    [
                        'account_id' => $this->account->id,
                        'status' => $orderData['status'] ?? null,
                        'total_amount' => $orderData['total_amount'] ?? null,
                        'currency' => $orderData['currency_id'] ?? null,
                        'buyer_nickname' => $orderData['buyer']['nickname'] ?? null,
                        'synced_at' => now(),
                    ],
                );
            }

            if (! empty($orders)) {
                SyncPaymentsJob::dispatch($this->account, $orders);
            }

            return count($orders);
        });
    }
}
