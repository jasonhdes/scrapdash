<?php

namespace App\Jobs;

use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Order;
use App\Models\Payment;
use App\Models\SyncLog;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncPaymentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    /**
     * @param  array<int, array<string, mixed>>  $ordersData  Pedidos do Mercado Livre já buscados por
     *                                                        SyncOrdersJob — os pagamentos vêm embutidos
     *                                                        no próprio recurso de pedido da API deles,
     *                                                        não existe endpoint separado de "pagamentos
     *                                                        do vendedor".
     */
    public function __construct(private readonly Account $account, private readonly array $ordersData) {}

    public function handle(): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_PAYMENTS, function () {
            $synced = 0;

            foreach ($this->ordersData as $orderData) {
                $order = Order::where('mercadolivre_order_id', (string) $orderData['id'])->first();

                if (! $order) {
                    continue;
                }

                foreach ($orderData['payments'] ?? [] as $paymentData) {
                    Payment::updateOrCreate(
                        ['mercadolivre_payment_id' => (string) $paymentData['id']],
                        [
                            'order_id' => $order->id,
                            'status' => $paymentData['status'] ?? null,
                            'transaction_amount' => $paymentData['transaction_amount'] ?? null,
                            'payment_method' => $paymentData['payment_method_id'] ?? null,
                            'paid_at' => isset($paymentData['date_approved']) ? Carbon::parse($paymentData['date_approved']) : null,
                            'synced_at' => now(),
                        ],
                    );
                    $synced++;
                }
            }

            return $synced;
        });
    }
}
