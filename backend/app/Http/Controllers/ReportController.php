<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\Payment;
use Carbon\Carbon;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ReportController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const MOVEMENT_LABELS = [
        'venda' => 'Venda aprovada',
        'liberacao' => 'Liberação de pagamento',
        'pecas_devolvidas' => 'Peças devolvidas',
        'comprou_cancelou' => 'Comprou e cancelou',
        'valor_retido' => 'Valor retido',
        'estorno_valor' => 'Estorno de valor',
        'desconto_venda' => 'Desconto de venda',
        'desconto_frete' => 'Desconto de frete',
        'venda_balcao' => 'Venda balcão',
    ];

    /**
     * Ledger unificado: vendas aprovadas, liberações de pagamento e os
     * eventos de devolução/cancelamento (mesmos da tela de Devoluções) —
     * tudo num só extrato ordenado por data, mais recente primeiro.
     */
    public function movements(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        $validated = $request->validate([
            'type' => ['nullable', 'string'],
            'search' => ['nullable', 'string'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:5000'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $startDate = isset($validated['start_date']) ? CarbonImmutable::parse($validated['start_date'])->startOfDay() : null;
        $endDate = isset($validated['end_date']) ? CarbonImmutable::parse($validated['end_date'])->endOfDay() : null;
        $type = $validated['type'] ?? null;

        $movements = collect();

        if (! $type || $type === 'venda') {
            $movements = $movements->merge(
                Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
                    ->where('status', 'approved')
                    ->when($startDate, fn ($q) => $q->where('paid_at', '>=', $startDate))
                    ->when($endDate, fn ($q) => $q->where('paid_at', '<=', $endDate))
                    ->with('order.items')
                    ->get()
                    ->map(fn (Payment $payment) => $this->fromPayment($payment, 'venda', $payment->paid_at)),
            );
        }

        if (! $type || $type === 'liberacao') {
            $movements = $movements->merge(
                Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
                    ->where('released', true)
                    ->whereNotNull('money_release_date')
                    ->when($startDate, fn ($q) => $q->where('money_release_date', '>=', $startDate))
                    ->when($endDate, fn ($q) => $q->where('money_release_date', '<=', $endDate))
                    ->with('order.items')
                    ->get()
                    ->map(fn (Payment $payment) => $this->fromPayment($payment, 'liberacao', $payment->money_release_date)),
            );
        }

        if (! $type || in_array($type, OrderReturn::STATUSES, true)) {
            $returnStatuses = $type ? [$type] : OrderReturn::STATUSES;

            $movements = $movements->merge(
                OrderReturn::where('account_id', $account->id)
                    ->whereIn('status', $returnStatuses)
                    ->when($startDate, fn ($q) => $q->where('occurred_at', '>=', $startDate))
                    ->when($endDate, fn ($q) => $q->where('occurred_at', '<=', $endDate))
                    ->with('order')
                    ->get()
                    ->map(fn (OrderReturn $return) => $this->fromReturn($return)),
            );
        }

        if ($validated['search'] ?? null) {
            $needle = mb_strtolower($validated['search']);
            $movements = $movements->filter(fn (array $m) => str_contains(mb_strtolower($m['buyer_name'] ?? ''), $needle)
                || str_contains(mb_strtolower($m['product_name'] ?? ''), $needle)
                || str_contains(mb_strtolower($m['mercadolivre_order_id'] ?? ''), $needle));
        }

        $movements = $movements->sortByDesc('occurred_at')->values();

        $perPage = (int) ($validated['per_page'] ?? 50);
        $page = (int) ($validated['page'] ?? 1);
        $total = $movements->count();
        $pageItems = $movements->forPage($page, $perPage)->values();

        return response()->json([
            'data' => $pageItems,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) max(1, ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ]);
    }

    /**
     * Consolidado mês a mês: receita bruta/líquida (mesma base do
     * dashboard), taxas do ML/MP e totais de devolução/cancelamento por
     * categoria — um mês por linha, sem período informado cobre os últimos
     * 12 meses.
     */
    public function monthly(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $endDate = isset($validated['end_date']) ? CarbonImmutable::parse($validated['end_date']) : CarbonImmutable::today();
        $startDate = isset($validated['start_date'])
            ? CarbonImmutable::parse($validated['start_date'])
            : $endDate->subMonthsNoOverflow(11)->startOfMonth();

        $ordersByMonth = Order::where('account_id', $account->id)
            ->where('status', 'paid')
            ->whereBetween('ordered_at', [$startDate->startOfDay(), $endDate->endOfDay()])
            ->with('approvedPayment')
            ->get(['id', 'ordered_at', 'total_amount'])
            ->groupBy(fn (Order $order) => $order->ordered_at->format('Y-m'));

        $feesByMonth = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->where('status', 'approved')
            ->whereNotNull('paid_at')
            ->whereBetween('paid_at', [$startDate->startOfDay(), $endDate->endOfDay()])
            ->get(['paid_at', 'ml_fee', 'mp_processing_fee', 'shipping_fee'])
            ->groupBy(fn (Payment $payment) => $payment->paid_at->format('Y-m'));

        // Devolução/cancelamento conta no mês da VENDA, não no mês em que o
        // status foi atualizado — um pedido vendido em junho e cancelado só
        // em agosto ainda "pesa" no resultado de junho. Só cai de volta pro
        // occurred_at quando não há pedido vinculado (registro manual).
        $returnsByMonth = OrderReturn::where('account_id', $account->id)
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereHas('order', fn ($oq) => $oq->whereBetween('ordered_at', [$startDate->startOfDay(), $endDate->endOfDay()]))
                    ->orWhere(function ($q2) use ($startDate, $endDate) {
                        $q2->whereNull('order_id')->whereBetween('occurred_at', [$startDate->startOfDay(), $endDate->endOfDay()]);
                    });
            })
            ->with('order:id,ordered_at')
            ->get(['id', 'order_id', 'occurred_at', 'status', 'value'])
            ->groupBy(fn (OrderReturn $return) => ($return->order?->ordered_at ?? $return->occurred_at)->format('Y-m'));

        $months = [];

        for ($cursor = $startDate->startOfMonth(); $cursor->lte($endDate); $cursor = $cursor->addMonthNoOverflow()) {
            $key = $cursor->format('Y-m');
            $monthOrders = $ordersByMonth->get($key, collect());
            $monthFees = $feesByMonth->get($key, collect());
            $monthReturns = $returnsByMonth->get($key, collect());

            $months[] = [
                'month' => $key,
                'orders_count' => $monthOrders->count(),
                'gross_revenue' => (float) $monthOrders->sum(fn (Order $o) => (float) $o->total_amount),
                'net_revenue' => (float) $monthOrders->sum(fn (Order $o) => (float) ($o->approvedPayment?->net_received_amount ?? 0)),
                'fees' => [
                    'ml_fee' => (float) $monthFees->sum(fn (Payment $p) => (float) $p->ml_fee),
                    'mp_processing_fee' => (float) $monthFees->sum(fn (Payment $p) => (float) $p->mp_processing_fee),
                    'shipping_fee' => (float) $monthFees->sum(fn (Payment $p) => (float) $p->shipping_fee),
                ],
                'returns_total' => (float) $monthReturns->sum(fn (OrderReturn $r) => (float) $r->value),
                'returns_by_status' => collect(OrderReturn::STATUSES)
                    ->mapWithKeys(function (string $status) use ($monthReturns) {
                        $rows = $monthReturns->where('status', $status);

                        return [$status => ['total' => (float) $rows->sum(fn (OrderReturn $r) => (float) $r->value), 'count' => $rows->count()]];
                    }),
            ];
        }

        $currency = Order::where('account_id', $account->id)->value('currency') ?? 'BRL';

        return response()->json([
            'currency' => $currency,
            'period' => ['start_date' => $startDate->toDateString(), 'end_date' => $endDate->toDateString()],
            'data' => array_reverse($months),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function fromPayment(Payment $payment, string $type, ?Carbon $occurredAt): array
    {
        $order = $payment->order;

        return [
            'id' => $type.'-'.$payment->id,
            'type' => $type,
            'label' => self::MOVEMENT_LABELS[$type],
            'occurred_at' => $occurredAt?->toIso8601String(),
            'order_id' => $order?->id,
            'mercadolivre_order_id' => $order?->mercadolivre_order_id,
            'buyer_name' => $order?->buyer_nickname,
            'product_name' => $order?->items->pluck('title')->filter()->implode(', ') ?: null,
            'value' => (float) ($payment->net_received_amount ?? $payment->transaction_amount),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function fromReturn(OrderReturn $return): array
    {
        return [
            'id' => 'return-'.$return->id,
            'type' => $return->status,
            'label' => self::MOVEMENT_LABELS[$return->status] ?? $return->status,
            'occurred_at' => $return->occurred_at?->toIso8601String(),
            'order_id' => $return->order_id,
            'mercadolivre_order_id' => $return->order?->mercadolivre_order_id,
            'buyer_name' => $return->buyer_name ?? $return->order?->buyer_nickname,
            'product_name' => $return->product_name,
            'value' => (float) $return->value,
        ];
    }
}
