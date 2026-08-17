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
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncOrderAddressesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    /**
     * Só existe um envio por chamada na API do Mercado Livre (não tem busca
     * em lote), então processamos aos poucos a cada execução, igual ao
     * SyncPaymentReleaseDatesJob.
     */
    private const BATCH_SIZE = 100;

    public function __construct(private readonly Account $account) {}

    public function handle(MercadoLivreService $mercadoLivre): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_ORDER_ADDRESSES, function () use ($mercadoLivre) {
            // `buyer_address_synced_at` marca toda tentativa (sucesso ou não),
            // não só quando a cidade/estado veio preenchida — sem isso, um
            // pedido cujo endereço nunca resolve (ex.: envio cancelado) seria
            // reprocessado pra sempre a cada execução, mesmo bug que já
            // corrigimos uma vez no SyncPaymentReleaseDatesJob. O mesmo vale
            // pra `shipping_status_synced_at`: como os dois vêm da mesma
            // chamada à API do envio, pedidos que já tinham o endereço
            // sincronizado antes do status de envio existir (ou vice-versa)
            // entram de novo no lote até os dois ficarem marcados juntos —
            // isso também cobre o backfill dos pedidos antigos.
            $orders = Order::where('account_id', $this->account->id)
                ->whereNotNull('shipping_id')
                ->where(function ($query) {
                    $query->whereNull('buyer_address_synced_at')
                        ->orWhereNull('shipping_status_synced_at');
                })
                ->orderBy('id')
                ->limit(self::BATCH_SIZE)
                ->get();

            $synced = 0;

            foreach ($orders as $order) {
                try {
                    $shipment = $mercadoLivre->getShipmentAddress($this->account, $order->shipping_id);
                } catch (Throwable $e) {
                    Log::warning("SyncOrderAddressesJob: falha no envio {$order->shipping_id} (pedido {$order->mercadolivre_order_id}): {$e->getMessage()}");

                    // Marca a tentativa mesmo assim — senão um envio com erro
                    // permanente (ex.: cancelado, sem permissão) voltaria a
                    // disputar o lote pra sempre em toda execução seguinte.
                    $order->update([
                        'buyer_address_synced_at' => now(),
                        'shipping_status_synced_at' => now(),
                    ]);

                    continue;
                }

                $order->update([
                    'buyer_city' => $shipment['city'],
                    'buyer_state' => $shipment['state'],
                    'buyer_address_synced_at' => now(),
                    'shipping_status' => $shipment['status'],
                    'shipping_substatus' => $shipment['substatus'],
                    'shipping_status_synced_at' => now(),
                ]);
                $synced++;
            }

            return $synced;
        });
    }
}
