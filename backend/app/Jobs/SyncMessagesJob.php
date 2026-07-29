<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Message;
use App\Models\Order;
use App\Models\SyncLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncMessagesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(private readonly Account $account) {}

    public function handle(MercadoLivreService $mercadoLivre): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_MESSAGES, function () use ($mercadoLivre) {
            $synced = 0;

            $orders = Order::where('account_id', $this->account->id)->get();

            // Pedidos que fazem parte da mesma compra (pack) compartilham a mesma
            // conversa — agrupamos para não consultar (nem contar) o mesmo pack
            // várias vezes, uma por pedido.
            $orderByPack = $orders->unique(fn (Order $order) => $order->pack_id ?? $order->mercadolivre_order_id);

            foreach ($orderByPack as $order) {
                $packId = $order->pack_id ?? $order->mercadolivre_order_id;

                try {
                    $messages = $mercadoLivre->getOrderMessages($this->account, $packId);
                } catch (Throwable $e) {
                    // Um pack com erro (rate limit, inconsistência pontual da API do ML)
                    // não deve abortar a sincronização inteira dos outros packs.
                    Log::warning("SyncMessagesJob: pulando pack {$packId} (order {$order->mercadolivre_order_id}): {$e->getMessage()}");

                    continue;
                }

                foreach ($messages as $messageData) {
                    $fromId = $messageData['from']['user_id'] ?? null;
                    $toId = $messageData['to']['user_id'] ?? null;
                    $isSent = $fromId == $this->account->mercadolivre_user_id;

                    Message::updateOrCreate(
                        ['mercadolivre_message_id' => (string) $messageData['id']],
                        [
                            'account_id' => $this->account->id,
                            'order_id' => $order->id,
                            'direction' => $isSent ? 'sent' : 'received',
                            // Quem não somos nós nessa conversa — precisa pra responder
                            // (a API de envio pede o `to.user_id` explicitamente).
                            'counterpart_id' => $isSent ? $toId : $fromId,
                            'text' => $messageData['text']['plain'] ?? $messageData['text'] ?? null,
                            'status' => $messageData['status'] ?? null,
                            'sent_at' => $messageData['message_date']['received'] ?? $messageData['message_date']['created'] ?? null,
                            'read_at' => $messageData['message_date']['read'] ?? null,
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
