<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Http\Resources\OrderReturnResource;
use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\SyncOrdersJob;
use App\Models\Account;
use App\Models\Order;
use App\Models\OrderReturn;
use App\Models\OrderReturnHistory;
use App\Models\Payment;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class OrderReturnController extends Controller
{
    /**
     * Agrupado por pedido: cada linha da tela é UM pedido, com o histórico
     * de mudanças de status (data + valor de cada evento) empilhado dentro
     * dela — em vez de um evento por linha solta, que espalhava o mesmo
     * pedido em várias linhas sem contexto entre si.
     */
    public function index(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'returns']);

        $returns = $this->filteredQuery($request, $account)
            ->with('order.items')
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->get();

        $groups = $returns
            ->groupBy(fn (OrderReturn $return) => $return->order_id ?? 'manual-'.$return->id)
            ->map(function ($group) {
                /** @var OrderReturn $first */
                $first = $group->first();
                $order = $first->order;

                return [
                    'group_key' => $first->order_id ?? 'manual-'.$first->id,
                    'order_id' => $first->order_id,
                    'mercadolivre_order_id' => $order?->mercadolivre_order_id,
                    'ordered_at' => $order?->ordered_at?->toIso8601String(),
                    'buyer_name' => $order?->buyer_nickname ?? $first->buyer_name,
                    'product_name' => $order?->items->pluck('title')->filter()->implode(', ') ?: $first->product_name,
                    'sku' => $order?->items->pluck('seller_sku')->filter()->implode(', ') ?: null,
                    'history' => $group->map(fn (OrderReturn $return) => (new OrderReturnResource($return))->toArray(request()))->values(),
                ];
            })
            ->sortByDesc(fn ($group) => $group['history']->max('occurred_at'))
            ->values();

        $perPage = $request->integer('per_page', 20);
        $page = $request->integer('page', 1);
        $total = $groups->count();
        $pageItems = $groups->forPage($page, $perPage)->values();

        return response()->json([
            'data' => $pageItems,
            'meta' => [
                'current_page' => $page,
                'last_page' => (int) max(1, ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
                'from' => $total === 0 ? null : ($page - 1) * $perPage + 1,
                'to' => $total === 0 ? null : min($page * $perPage, $total),
            ],
        ]);
    }

    /**
     * Total por categoria de status, respeitando os mesmos filtros da
     * listagem (período/status/verificado/busca) — alimenta os cards de
     * resumo no topo da página, no mesmo espírito da planilha original.
     */
    public function summary(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'returns']);

        $totals = $this->filteredQuery($request, $account)
            ->selectRaw('status, sum(value) as total, count(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status')
            ->map(fn ($row) => ['total' => (float) $row->total, 'count' => (int) $row->count]);

        $currency = Order::where('account_id', $account->id)->value('currency') ?? 'BRL';

        return response()->json([
            'currency' => $currency,
            'by_status' => collect(OrderReturn::STATUSES)
                ->mapWithKeys(fn ($status) => [$status => $totals->get($status, ['total' => 0.0, 'count' => 0])]),
        ]);
    }

    public function store(Request $request, Account $account): OrderReturnResource
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'returns']);

        $validated = $this->validated($request, $account);

        $return = OrderReturn::create([
            'verified' => false,
            ...$validated,
            'account_id' => $account->id,
            'source' => 'manual',
        ]);

        AuditLogger::log($actor, 'return.created', $account, $return);

        return new OrderReturnResource($return->load('order'));
    }

    public function update(Request $request, Account $account, OrderReturn $return): OrderReturnResource
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'returns']);

        abort_if($return->account_id !== $account->id, 404);

        // "verified" pode ser alternado em qualquer registro (auto ou
        // manual) — é a conferência manual pedida. Os demais campos só
        // fazem sentido editar em registros criados à mão; os automáticos
        // são a fonte de verdade do pedido/pagamento sincronizado.
        if ($request->has('verified') && count($request->all()) === 1) {
            $return->update(['verified' => $request->boolean('verified')]);

            return new OrderReturnResource($return->load('order'));
        }

        abort_if($return->source !== 'manual', 422, 'Só é possível editar os demais campos de registros criados manualmente.');

        $validated = $this->validated($request, $account);
        $return->update($validated);

        AuditLogger::log($actor, 'return.updated', $account, $return);

        return new OrderReturnResource($return->load('order'));
    }

    public function destroy(Account $account, OrderReturn $return): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'returns']);

        abort_if($return->account_id !== $account->id, 404);

        $return->delete();

        AuditLogger::log($actor, 'return.deleted', $account, $return);

        return response()->json(['deleted' => true]);
    }

    /**
     * Gera/atualiza os registros automáticos a partir dos pedidos e
     * pagamentos já sincronizados — pedidos cancelados (com ou sem retorno
     * físico da mercadoria) e pagamentos em mediação/estornados. Idempotente
     * por causa da constraint única (account_id, order_id, status): rodar de
     * novo só atualiza os valores, não duplica.
     */
    public function sync(Account $account, MercadoLivreService $mercadoLivre): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'returns']);

        set_time_limit(0);

        $created = 0;
        $updated = 0;
        $removed = 0;

        // Mesmo piso do SyncOrdersJob: pedidos anteriores a essa data vêm
        // dos relatórios oficiais/planilhas (já classificados por regras de
        // negócio específicas da importação), não da API ao vivo. Sem esse
        // piso, este sync reprocessa TODO pedido cancelado da conta a cada
        // execução e reclassifica tudo pela heurística "ao vivo" (horas
        // desde a compra baseado em status_changed_at) — que não existe
        // pros pedidos importados, corrompendo silenciosamente os saldos
        // históricos de desconto_venda/desconto_frete (já aconteceu).
        $floor = CarbonImmutable::parse(SyncOrdersJob::LIVE_SYNC_FLOOR_DATE);

        // Ciclo de vida de um pedido cancelado:
        // - cancelado em até 24h da compra -> comprou_cancelou (valor bruto)
        // - cancelado depois de 24h -> desconto_venda (valor líquido: preço
        //   - taxas do ML/MP, já que elas normalmente não voltam)
        // "desconto_frete": mesma regra descoberta no relatório oficial de
        // vendas do ML — sempre que o valor líquido do pagamento (aqui ou
        // nos ramos de mediação/estorno abaixo) vem negativo, é o frete que
        // ficou com o vendedor no cancelamento; separa esse valor como
        // desconto_frete e usa 0 no evento principal, nunca um negativo.
        // "peças devolvidas" NÃO entra aqui: só é confirmado manualmente
        // quando a peça chega fisicamente de volta na loja.
        $cancelledLifecycleStatuses = [
            OrderReturn::STATUS_COMPROU_CANCELOU,
            OrderReturn::STATUS_DESCONTO_VENDA,
            OrderReturn::STATUS_DESCONTO_FRETE,
        ];

        $cancelledOrders = Order::where('account_id', $account->id)
            ->where('status', 'cancelled')
            ->where('ordered_at', '>=', $floor)
            ->with(['items', 'payments' => fn ($q) => $q->orderByDesc('id')])
            ->get();

        foreach ($cancelledOrders as $order) {
            $payment = $order->payments->first();

            // Pedidos cujo pagamento passou por mediação (em disputa agora
            // ou já resolvida) são classificados exclusivamente pelos laços
            // de mediação mais abaixo — mais específicos que a heurística
            // genérica de "cancelado há X horas" daqui, e evita os dois
            // laços brigando pelo mesmo pedido na mesma sincronização.
            if ($payment?->mediation_detected_at) {
                continue;
            }

            $referenceTime = $payment?->status_changed_at ?? $order->ordered_at;
            $hoursSinceOrder = $order->ordered_at && $referenceTime
                ? $order->ordered_at->diffInHours($referenceTime)
                : null;

            $isComprouCancelou = $hoursSinceOrder !== null && $hoursSinceOrder < 24;
            $targetStatuses = $isComprouCancelou
                ? [OrderReturn::STATUS_COMPROU_CANCELOU]
                : [OrderReturn::STATUS_DESCONTO_VENDA];

            // O sync normal de pagamentos só preenche taxas/valor líquido
            // pra pagamentos aprovados — pedidos cancelados/estornados nunca
            // passam por ali, então busca ao vivo só quando realmente falta
            // e o "desconto de venda" (que usa o valor líquido) se aplica.
            if (! $isComprouCancelou && $payment && $payment->net_received_amount === null) {
                $release = $mercadoLivre->getPaymentRelease($account, $payment->mercadolivre_payment_id);
                $payment->update(['net_received_amount' => $release['net_received_amount']]);
            }

            $buyerName = $order->buyer_nickname;
            $productName = $order->items->pluck('title')->filter()->implode(', ') ?: null;
            $occurredAt = $referenceTime ?? now();
            $commonAttrs = ['occurred_at' => $occurredAt, 'buyer_name' => $buyerName, 'product_name' => $productName];

            foreach ($targetStatuses as $status) {
                $value = match ($status) {
                    // Valor líquido: o que o vendedor efetivamente receberia
                    // pela venda (preço - taxas do ML/MP) — não o valor bruto
                    // do anúncio, já que as taxas normalmente não voltam.
                    OrderReturn::STATUS_DESCONTO_VENDA => (float) ($payment?->net_received_amount ?? $order->total_amount),
                    default => (float) $order->total_amount,
                };

                // Mesma regra descoberta no relatório oficial de vendas do
                // ML: quando o valor líquido do pagamento fica negativo, é
                // porque o frete foi cobrado do vendedor no cancelamento —
                // separa isso como "desconto de frete" e usa 0 aqui, nunca
                // um valor negativo.
                if ($payment?->net_received_amount !== null && $payment->net_received_amount < 0) {
                    $value = max($value, 0.0);
                }

                $result = $this->upsertAuto($account, $order->id, $status, [...$commonAttrs, 'value' => $value]);

                $result ? $created++ : $updated++;
            }

            if ($payment?->net_received_amount !== null && $payment->net_received_amount < 0) {
                $shipResult = $this->upsertAuto($account, $order->id, OrderReturn::STATUS_DESCONTO_FRETE, [
                    ...$commonAttrs,
                    'value' => abs((float) $payment->net_received_amount),
                ]);
                $shipResult ? $created++ : $updated++;
                $targetStatuses[] = OrderReturn::STATUS_DESCONTO_FRETE;
            }

            $staleStatuses = array_diff($cancelledLifecycleStatuses, $targetStatuses);
            $removed += OrderReturn::where('account_id', $account->id)
                ->where('order_id', $order->id)
                ->where('source', 'auto')
                ->whereIn('status', $staleStatuses)
                ->delete();
        }

        $mediationPayments = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id)->where('ordered_at', '>=', $floor))
            ->where('status', 'in_mediation')
            ->with('order.items')
            ->get();

        foreach ($mediationPayments as $payment) {
            // Mesmo critério do "desconto de venda": o que interessa é o
            // valor líquido que está retido, não o valor bruto pago pelo
            // comprador.
            if ($payment->net_received_amount === null) {
                $release = $mercadoLivre->getPaymentRelease($account, $payment->mercadolivre_payment_id);
                $payment->update([
                    'shipping_fee' => $release['shipping_fee'],
                    'net_received_amount' => $release['net_received_amount'],
                    'shipping_charged_on_cancel' => $release['shipping_charged_on_cancel'],
                ]);
            }

            $mediationAttrs = [
                'occurred_at' => $payment->mediation_detected_at ?? $payment->paid_at ?? $payment->synced_at ?? now(),
                'buyer_name' => $payment->order?->buyer_nickname,
                'product_name' => $payment->order?->items->pluck('title')->filter()->implode(', ') ?: null,
            ];

            $value = (float) ($payment->net_received_amount ?? $payment->transaction_amount);

            if ($payment->net_received_amount !== null && $payment->net_received_amount < 0) {
                $value = max($value, 0.0);
                $shipResult = $this->upsertAuto($account, $payment->order_id, OrderReturn::STATUS_DESCONTO_FRETE, [
                    ...$mediationAttrs,
                    'value' => abs((float) $payment->net_received_amount),
                ]);
                $shipResult ? $created++ : $updated++;
            }

            $result = $this->upsertAuto($account, $payment->order_id, OrderReturn::STATUS_VALOR_RETIDO, [
                ...$mediationAttrs,
                'value' => $value,
            ]);

            $result ? $created++ : $updated++;
        }

        // Resolução de mediação: pagamentos que JÁ passaram por mediação
        // (mediation_detected_at preenchido) e não estão mais em mediação
        // agora — a disputa acabou, e o "valor_retido" precisa virar um
        // dos dois desfechos possíveis:
        // - saldo líquido zerado ou negativo -> o comprador desistiu da
        //   compra / vai devolver -> "desconto_venda" (o mesmo desfecho de
        //   um cancelamento normal), com "desconto_frete" à parte se o
        //   saldo tiver ficado negativo (frete ficou com o vendedor);
        // - saldo líquido positivo -> o valor retido voltou pro vendedor ->
        //   "estorno_valor", pelo valor líquido efetivamente liberado.
        $resolvedMediationPayments = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id)->where('ordered_at', '>=', $floor))
            ->whereNotNull('mediation_detected_at')
            ->where('status', '!=', 'in_mediation')
            ->with('order.items')
            ->get();

        foreach ($resolvedMediationPayments as $payment) {
            if ($payment->net_received_amount === null) {
                $release = $mercadoLivre->getPaymentRelease($account, $payment->mercadolivre_payment_id);
                $payment->update([
                    'shipping_fee' => $release['shipping_fee'],
                    'net_received_amount' => $release['net_received_amount'],
                    'shipping_charged_on_cancel' => $release['shipping_charged_on_cancel'],
                ]);
            }

            $resolvedAttrs = [
                'occurred_at' => $payment->status_changed_at ?? $payment->synced_at ?? now(),
                'buyer_name' => $payment->order?->buyer_nickname,
                'product_name' => $payment->order?->items->pluck('title')->filter()->implode(', ') ?: null,
            ];

            $netReceived = $payment->net_received_amount !== null ? (float) $payment->net_received_amount : null;
            $isPositive = $netReceived !== null && $netReceived > 0;

            if ($isPositive) {
                $targetStatus = OrderReturn::STATUS_ESTORNO_VALOR;
                $value = $netReceived;
            } else {
                $targetStatus = OrderReturn::STATUS_DESCONTO_VENDA;
                $value = max($netReceived ?? (float) ($payment->order?->total_amount ?? 0), 0.0);

                if ($netReceived !== null && $netReceived < 0) {
                    $shipResult = $this->upsertAuto($account, $payment->order_id, OrderReturn::STATUS_DESCONTO_FRETE, [
                        ...$resolvedAttrs,
                        'value' => abs($netReceived),
                    ]);
                    $shipResult ? $created++ : $updated++;
                }
            }

            $result = $this->upsertAuto($account, $payment->order_id, $targetStatus, [
                ...$resolvedAttrs,
                'value' => $value,
            ]);

            $result ? $created++ : $updated++;

            $removed += OrderReturn::where('account_id', $account->id)
                ->where('order_id', $payment->order_id)
                ->where('source', 'auto')
                ->where('status', OrderReturn::STATUS_VALOR_RETIDO)
                ->delete();

            // "desconto_venda" e "estorno_valor" são desfechos mutuamente
            // exclusivos da MESMA mediação — se um resync anterior tinha
            // decidido um lado e agora o saldo mudou de sinal, remove o
            // outro pra não deixar os dois vivos ao mesmo tempo.
            $staleResolution = $targetStatus === OrderReturn::STATUS_ESTORNO_VALOR
                ? OrderReturn::STATUS_DESCONTO_VENDA
                : OrderReturn::STATUS_ESTORNO_VALOR;

            $removed += OrderReturn::where('account_id', $account->id)
                ->where('order_id', $payment->order_id)
                ->where('source', 'auto')
                ->where('status', $staleResolution)
                ->delete();
        }

        return response()->json(['created' => $created, 'updated' => $updated, 'removed' => $removed]);
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    private function upsertAuto(Account $account, ?int $orderId, string $status, array $attributes): bool
    {
        $existing = OrderReturn::where('account_id', $account->id)
            ->where('order_id', $orderId)
            ->where('status', $status)
            ->first();

        if ($existing) {
            // Só grava um novo snapshot de histórico quando o valor
            // realmente mudou — senão todo resync (que reafirma o mesmo
            // evento em aberto, ex: mediação ainda ativa) lotaria a página
            // de detalhes do pedido com dezenas de entradas idênticas.
            $valueChanged = round((float) $existing->value, 2) !== round((float) ($attributes['value'] ?? $existing->value), 2);

            $existing->update($attributes);

            if ($valueChanged) {
                $this->logHistory($account, $orderId, $status, $attributes);
            }

            return false;
        }

        OrderReturn::create([
            ...$attributes,
            'account_id' => $account->id,
            'order_id' => $orderId,
            'status' => $status,
            'source' => 'auto',
        ]);

        $this->logHistory($account, $orderId, $status, $attributes);

        return true;
    }

    /**
     * Registra um snapshot append-only em `order_return_histories` — ao
     * contrário de `order_returns` (que só guarda o estado atual, no máximo
     * 1 linha por pedido+status), esta trilha nunca é sobrescrita/apagada,
     * permitindo ver na página do pedido toda a evolução (ex: valor_retido
     * → estorno_valor).
     *
     * @param  array<string, mixed>  $attributes
     */
    private function logHistory(Account $account, ?int $orderId, string $status, array $attributes): void
    {
        OrderReturnHistory::create([
            'account_id' => $account->id,
            'order_id' => $orderId,
            'status' => $status,
            'occurred_at' => $attributes['occurred_at'] ?? now(),
            'buyer_name' => $attributes['buyer_name'] ?? null,
            'value' => $attributes['value'] ?? 0,
            'product_name' => $attributes['product_name'] ?? null,
            'source' => 'auto',
        ]);
    }

    /**
     * @return Builder<OrderReturn>
     */
    private function filteredQuery(Request $request, Account $account): Builder
    {
        return OrderReturn::where('account_id', $account->id)
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->has('verified'), fn ($q) => $q->where('verified', $request->boolean('verified')))
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('occurred_at', '>=', $date->startOfDay()))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('occurred_at', '<=', $date->endOfDay()))
            ->when($request->string('search')->isNotEmpty(), fn ($q) => $q->where(fn ($q) => $q
                ->where('buyer_name', 'like', '%'.$request->string('search').'%')
                ->orWhere('product_name', 'like', '%'.$request->string('search').'%')
                ->orWhereHas('order', fn ($oq) => $oq->where('mercadolivre_order_id', 'like', '%'.$request->string('search').'%'))));
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, Account $account): array
    {
        $validated = $request->validate([
            'order_id' => ['nullable', 'integer', 'exists:orders,id'],
            'status' => ['required', 'string', 'in:'.implode(',', OrderReturn::STATUSES)],
            'occurred_at' => ['required', 'date'],
            'buyer_name' => ['nullable', 'string', 'max:255'],
            'value' => ['required', 'numeric'],
            'product_name' => ['nullable', 'string', 'max:255'],
            'verified' => ['sometimes', 'boolean'],
        ]);

        if (isset($validated['order_id'])) {
            $belongsToAccount = Order::where('id', $validated['order_id'])->where('account_id', $account->id)->exists();
            abort_if(! $belongsToAccount, 422, 'Pedido não pertence a essa conta.');
        }

        return $validated;
    }
}
