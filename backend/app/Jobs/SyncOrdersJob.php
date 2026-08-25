<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SyncLog;
use Carbon\Carbon;
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
            return $this->applyOrders($mercadoLivre->searchOrders($this->account));
        });
    }

    /**
     * Grava/atualiza os pedidos retornados pela API — extraído de `handle()`
     * pra ser reaproveitado também pela importação de histórico por período
     * (ver ImportOrderHistoryJob), que busca os dados em blocos de data em
     * vez de "os mais recentes".
     *
     * @param  array<int, array<string, mixed>>  $orders
     */
    public function applyOrders(array $orders): int
    {
        foreach ($orders as $orderData) {
            $order = Order::updateOrCreate(
                ['mercadolivre_order_id' => (string) $orderData['id']],
                [
                    'account_id' => $this->account->id,
                    'pack_id' => isset($orderData['pack_id']) ? (string) $orderData['pack_id'] : null,
                    'shipping_id' => isset($orderData['shipping']['id']) ? (string) $orderData['shipping']['id'] : null,
                    'status' => $orderData['status'] ?? null,
                    'total_amount' => $orderData['total_amount'] ?? null,
                    'currency' => $orderData['currency_id'] ?? null,
                    'buyer_nickname' => $orderData['buyer']['nickname'] ?? null,
                    'ordered_at' => isset($orderData['date_created']) ? Carbon::parse($orderData['date_created']) : null,
                    'synced_at' => now(),
                ],
            );

            $this->syncItems($order, $orderData['order_items'] ?? []);
            $this->syncLogisticType($order);
        }

        if (! empty($orders)) {
            // Chamado em processo, não via ::dispatch(): $orders pode ter até 1000
            // pedidos com todos os dados aninhados da API do ML, e serializar isso
            // para a tabela `jobs` estoura o max_allowed_packet do MySQL. Como já
            // estamos com os dados em memória aqui, não há motivo pra passar pela fila.
            (new SyncPaymentsJob($this->account, $orders))->handle();
        }

        return count($orders);
    }

    /**
     * Os itens de um pedido não mudam depois que ele é feito, então o mais
     * simples é substituir tudo a cada sincronização em vez de tentar casar
     * item por item (não existe um id de linha estável pra isso na API).
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function syncItems(Order $order, array $items): void
    {
        $order->items()->delete();

        foreach ($items as $itemData) {
            OrderItem::create([
                'order_id' => $order->id,
                'mercadolivre_item_id' => (string) ($itemData['item']['id'] ?? ''),
                'title' => $itemData['item']['title'] ?? '',
                'seller_sku' => $itemData['item']['seller_sku'] ?? null,
                'quantity' => $itemData['quantity'] ?? 0,
                'unit_price' => $itemData['unit_price'] ?? null,
                'currency' => $itemData['currency_id'] ?? null,
            ]);
        }
    }

    /**
     * "Depósito" do pedido (FULL/ML vs próprio vendedor) — a API de pedidos
     * não traz isso diretamente, mas o catálogo de produtos (sincronizado à
     * parte) já tem esse dado por anúncio; casa pelo id do item pra herdar
     * o mesmo campo já usado em Produtos.
     */
    private function syncLogisticType(Order $order): void
    {
        $itemId = $order->items()->value('mercadolivre_item_id');

        if (! $itemId) {
            return;
        }

        $logisticType = Product::where('account_id', $this->account->id)
            ->where('mercadolivre_item_id', $itemId)
            ->value('logistic_type');

        if ($logisticType) {
            $order->update(['logistic_type' => $logisticType]);
        }
    }
}
