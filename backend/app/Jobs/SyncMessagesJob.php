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

            foreach ($orders as $order) {
                $messages = $mercadoLivre->getOrderMessages($this->account, $order->mercadolivre_order_id);

                foreach ($messages as $messageData) {
                    Message::updateOrCreate(
                        ['mercadolivre_message_id' => (string) $messageData['id']],
                        [
                            'account_id' => $this->account->id,
                            'order_id' => $order->id,
                            'direction' => ($messageData['from']['user_id'] ?? null) == $this->account->mercadolivre_user_id
                                ? 'sent'
                                : 'received',
                            'text' => $messageData['text']['plain'] ?? $messageData['text'] ?? null,
                            'status' => $messageData['status'] ?? null,
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
