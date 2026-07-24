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

        $revenue = (clone $ordersQuery)->where('status', 'paid')->sum('total_amount');

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
                'currency' => $currency,
            ],
            'orders' => [
                'total' => (int) $ordersByStatus->sum(),
                'by_status' => $ordersByStatus,
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

        $recentFailures = SyncLog::where('account_id', $account->id)
            ->where('status', SyncLog::STATUS_FAILED)
            ->where('created_at', '>=', now()->subDay())
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->get();

        foreach ($recentFailures as $failure) {
            $alerts[] = [
                'type' => 'sync_failed',
                'message' => "Falha na sincronização de {$failure->type} nas últimas 24h ({$failure->total}x).",
            ];
        }

        return $alerts;
    }
}
