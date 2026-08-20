<?php

namespace App\Application\Services;

use App\Models\Account;
use App\Models\Message;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\SyncLog;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;

class DashboardService
{
    private const CACHE_TTL_SECONDS = 30;

    /**
     * @return array<string, mixed>
     */
    public function forAccount(Account $account, ?CarbonImmutable $startDate = null, ?CarbonImmutable $endDate = null): array
    {
        $cacheKey = sprintf(
            'dashboard:%d:%s:%s',
            $account->id,
            $startDate?->toDateString() ?? 'all',
            $endDate?->toDateString() ?? 'all',
        );

        return Cache::remember(
            $cacheKey,
            self::CACHE_TTL_SECONDS,
            fn () => $this->build($account, $startDate, $endDate),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function build(Account $account, ?CarbonImmutable $startDate, ?CarbonImmutable $endDate): array
    {
        $ordersQuery = Order::where('account_id', $account->id);
        $this->applyDateRange($ordersQuery, $startDate, $endDate);

        $ordersByStatus = (clone $ordersQuery)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        // "Enviado" cobre tanto o pedido já entregue quanto o que só saiu
        // pro transporte; "devolvido" exige pedido cancelado (status) com o
        // envio já tendo saído pra entrega — seja porque chegou a ser
        // entregue e o cliente devolveu depois (delivered), seja porque
        // voltou pro remetente sem ser entregue (not_delivered).
        $shippedTotal = (clone $ordersQuery)->whereIn('shipping_status', ['shipped', 'delivered'])->count();
        $returnedTotal = (clone $ordersQuery)
            ->where('status', 'cancelled')
            ->whereIn('shipping_status', ['delivered', 'not_delivered'])
            ->count();

        // Agrupamento pro gráfico "Pedidos por status": não é o status bruto
        // do pedido, e sim o status combinado com o do envio. Usa subtração
        // em vez de comparar `shipping_status != 'delivered'` direto pra não
        // cair na pegadinha do NULL em SQL (pedido cujo envio ainda não foi
        // sincronizado não bateria nem com `= delivered` nem com
        // `!= delivered`).
        $paidLikeTotal = (clone $ordersQuery)->whereIn('status', ['paid', 'partially_refunded'])->count();
        $completedTotal = (clone $ordersQuery)
            ->whereIn('status', ['paid', 'partially_refunded'])
            ->where('shipping_status', 'delivered')
            ->count();
        $inTransitTotal = $paidLikeTotal - $completedTotal;

        $cancelledTotal = (clone $ordersQuery)->where('status', 'cancelled')->count();
        $cancelledOnlyTotal = $cancelledTotal - $returnedTotal;

        $revenue = (clone $ordersQuery)->where('status', 'paid')->sum('total_amount');

        // Receita líquida: soma do valor líquido (já descontadas as taxas do
        // ML/MP) do pagamento aprovado de cada pedido, esteja o dinheiro já
        // liberado ou ainda a receber — por isso usa o mesmo filtro de
        // status 'paid' da receita bruta, não o status de liberação.
        $netRevenue = (clone $ordersQuery)->where('status', 'paid')
            ->with('approvedPayment')
            ->get(['id'])
            ->sum(fn (Order $order) => (float) ($order->approvedPayment?->net_received_amount ?? 0));

        $currency = (clone $ordersQuery)->value('currency');

        $paymentsByStatus = Payment::whereHas('order', function ($q) use ($account, $startDate, $endDate) {
            $q->where('account_id', $account->id);
            $this->applyDateRange($q, $startDate, $endDate);
        })
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $productsTotal = Product::where('account_id', $account->id)->count();
        $productsActive = Product::where('account_id', $account->id)->where('status', 'active')->count();

        $messagesTotal = Message::where('account_id', $account->id)->count();
        $messagesReceived = Message::where('account_id', $account->id)->where('direction', 'received')->count();

        $lastSyncedAt = collect([
            Product::where('account_id', $account->id)->max('synced_at'),
            Order::where('account_id', $account->id)->max('synced_at'),
            Message::where('account_id', $account->id)->max('synced_at'),
        ])->filter()->max();

        return [
            'account' => ['id' => $account->id, 'name' => $account->name],
            'period' => [
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
            ],
            'revenue' => [
                'total' => (float) $revenue,
                'net_total' => (float) $netRevenue,
                'currency' => $currency,
            ],
            'orders' => [
                'total' => (int) $ordersByStatus->sum(),
                'by_status' => $ordersByStatus,
                'shipped' => $shippedTotal,
                'returned' => $returnedTotal,
                'by_group' => [
                    'completed' => $completedTotal,
                    'in_transit' => $inTransitTotal,
                    'returned' => $returnedTotal,
                    'cancelled' => $cancelledOnlyTotal,
                ],
            ],
            'products' => [
                'total' => $productsTotal,
                'active' => $productsActive,
            ],
            'payments' => [
                'by_status' => $paymentsByStatus,
            ],
            'messages' => [
                'total' => $messagesTotal,
                'received' => $messagesReceived,
            ],
            'alerts' => $this->buildAlerts($account),
            'last_synced_at' => $lastSyncedAt,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Receita diária (pedidos pagos) dentro do período — usada pro gráfico de
     * tendência do dashboard. Sem período informado, usa os últimos 30 dias
     * (diferente de `forAccount`, que é all-time por padrão: uma série
     * all-time de anos não cabe num gráfico legível).
     *
     * @return array<string, mixed>
     */
    public function revenueSeries(Account $account, ?CarbonImmutable $startDate, ?CarbonImmutable $endDate): array
    {
        $endDate ??= CarbonImmutable::today();
        $startDate ??= $endDate->subDays(29);

        $orders = Order::where('account_id', $account->id)
            ->where('status', 'paid')
            ->whereBetween('ordered_at', [$startDate->startOfDay(), $endDate->endOfDay()])
            ->with('approvedPayment')
            ->get(['id', 'ordered_at', 'total_amount']);

        $byDate = $orders->groupBy(fn (Order $order) => $order->ordered_at->toDateString());

        $series = [];
        for ($date = $startDate; $date->lte($endDate); $date = $date->addDay()) {
            $key = $date->toDateString();
            $dayOrders = $byDate->get($key, collect());
            $series[] = [
                'date' => $key,
                'revenue' => (float) $dayOrders->sum('total_amount'),
                'net_revenue' => (float) $dayOrders->sum(fn (Order $order) => (float) ($order->approvedPayment?->net_received_amount ?? 0)),
            ];
        }

        $currency = Order::where('account_id', $account->id)->value('currency');

        return [
            'period' => ['start_date' => $startDate->toDateString(), 'end_date' => $endDate->toDateString()],
            'currency' => $currency,
            'series' => $series,
        ];
    }

    /**
     * Quantidade de pedidos por estado do comprador — usada no mapa de
     * distribuição de clientes do dashboard. Estados nulos (endereço ainda
     * não sincronizado, ver SyncOrderAddressesJob) ficam fora do agrupamento.
     *
     * @return array<string, mixed>
     */
    public function customersByState(Account $account, ?CarbonImmutable $startDate, ?CarbonImmutable $endDate): array
    {
        $query = Order::where('account_id', $account->id)->whereNotNull('buyer_state');
        $this->applyDateRange($query, $startDate, $endDate);

        $byState = $query->selectRaw('buyer_state, count(*) as total')
            ->groupBy('buyer_state')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => ['state' => $row->buyer_state, 'total' => (int) $row->total]);

        return ['data' => $byState];
    }

    /**
     * @param  Builder<Order>  $query
     */
    private function applyDateRange($query, ?CarbonImmutable $startDate, ?CarbonImmutable $endDate): void
    {
        if ($startDate) {
            $query->where('ordered_at', '>=', $startDate->startOfDay());
        }

        if ($endDate) {
            $query->where('ordered_at', '<=', $endDate->endOfDay());
        }
    }

    /**
     * @return array<int, array{type: string, message: string}>
     */
    private function buildAlerts(Account $account): array
    {
        $alerts = [];

        $unreadMessages = Message::where('account_id', $account->id)
            ->where('direction', 'received')
            ->whereNull('read_at')
            ->count();

        if ($unreadMessages > 0) {
            $alerts[] = [
                'type' => 'unread_messages',
                'message' => $unreadMessages === 1
                    ? '1 mensagem não lida.'
                    : "{$unreadMessages} mensagens não lidas.",
            ];
        }

        if (! $account->isConnectedToMercadoLivre()) {
            $alerts[] = [
                'type' => 'not_connected',
                'message' => 'Conta não conectada ao Mercado Livre.',
            ];
        } elseif ($account->mercadolivre_token_expires_at?->isPast()) {
            $alerts[] = [
                'type' => 'token_expired',
                'message' => 'Token do Mercado Livre expirado. Reconecte a conta para retomar a sincronização.',
            ];
        } elseif ($account->mercadoLivreTokenExpiresSoon()) {
            $alerts[] = [
                'type' => 'token_expiring',
                'message' => 'Token do Mercado Livre expira em breve.',
            ];
        }

        // Só alerta se a sincronização mais recente de cada tipo falhou — se já
        // teve uma sincronização bem-sucedida depois, o problema foi resolvido
        // e o alerta não deve continuar aparecendo pelo resto das 24h.
        $recentLogs = SyncLog::where('account_id', $account->id)
            ->where('created_at', '>=', now()->subDay())
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('type');

        foreach ($recentLogs as $type => $logs) {
            $mostRecent = $logs->first();

            if ($mostRecent->status === SyncLog::STATUS_FAILED) {
                $failuresSinceLastSuccess = $logs->takeWhile(fn ($log) => $log->status === SyncLog::STATUS_FAILED)->count();

                $alerts[] = [
                    'type' => 'sync_failed',
                    'message' => "Falha na sincronização de {$type} ({$failuresSinceLastSuccess}x seguidas, última em {$mostRecent->created_at->format('d/m H:i')}).",
                ];
            }
        }

        return $alerts;
    }
}
