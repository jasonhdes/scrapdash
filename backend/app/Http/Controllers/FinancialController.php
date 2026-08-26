<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Models\Account;
use App\Models\OrderReturn;
use App\Models\Payment;
use App\Models\Purchase;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class FinancialController extends Controller
{
    public function summary(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $startDate = isset($validated['start_date']) ? CarbonImmutable::parse($validated['start_date']) : null;
        $endDate = isset($validated['end_date']) ? CarbonImmutable::parse($validated['end_date']) : null;

        $base = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->when($startDate, fn ($q) => $q->where('paid_at', '>=', $startDate->startOfDay()))
            ->when($endDate, fn ($q) => $q->where('paid_at', '<=', $endDate->endOfDay()));

        $approved = (clone $base)->where('status', 'approved');

        // Bruto: valor total das vendas (o que o comprador pagou). Líquido:
        // o que efetivamente entra pro vendedor, já descontadas as taxas do
        // ML/MP — a métrica mais importante desta página.
        $totalGross = (clone $approved)->sum('transaction_amount');
        $totalNet = (clone $approved)->sum('net_received_amount');

        // "Total recebido": vendas aprovadas cujo dinheiro já foi liberado
        // pro vendedor. "A receber": aprovadas ainda não liberadas.
        // `released = true`/`= false` (não "não true"/"não false") de
        // propósito, pra excluir os pagamentos importados das planilhas
        // históricas, que nunca passam pela checagem ao vivo e ficariam com
        // `released` nulo pra sempre — não fazem sentido em nenhum dos dois.
        $received = (clone $approved)->where('released', true);
        $receivedAmount = (clone $received)->sum('net_received_amount');
        $receivedCount = (clone $received)->count();

        $pendingReceivable = (clone $approved)->where('released', false);
        $pendingReceivableAmount = (clone $pendingReceivable)->sum('net_received_amount');
        $pendingReceivableCount = (clone $pendingReceivable)->count();

        $cancelledSales = (clone $base)->where('status', 'refunded');
        $cancelledSalesAmount = (clone $cancelledSales)->sum('net_received_amount');
        $cancelledSalesCount = (clone $cancelledSales)->count();

        $heldValue = (clone $base)->where('status', 'in_mediation');
        $heldValueAmount = (clone $heldValue)->sum('net_received_amount');
        $heldValueCount = (clone $heldValue)->count();

        return response()->json([
            'period' => [
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
            ],
            'total_gross' => (float) $totalGross,
            'total_net' => (float) $totalNet,
            'total_received' => ['total' => $receivedCount, 'amount' => (float) $receivedAmount],
            'pending_receivable' => ['total' => $pendingReceivableCount, 'amount' => (float) $pendingReceivableAmount],
            'cancelled_sales' => ['total' => $cancelledSalesCount, 'amount' => (float) $cancelledSalesAmount],
            'held_value' => ['total' => $heldValueCount, 'amount' => (float) $heldValueAmount],
        ]);
    }

    /**
     * Saldo acumulado (nunca filtrado por data, ao contrário de summary()):
     * seed digitado manualmente + vendas líquidas de todo o histórico -
     * compras - devoluções/cancelamentos/desconto de frete CONFIRMADOS
     * (checkbox `verified`). Serve de referência pro usuário bater com o
     * extrato real do Mercado Pago, que este sistema não acessa.
     */
    public function balance(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        return response()->json($this->buildBalancePayload($account));
    }

    public function updateBalanceSeed(Request $request, Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $validated = $request->validate([
            'value' => ['required', 'numeric'],
        ]);

        // O lápis substitui o valor salvo — não soma. É uma recalibração
        // manual pro valor real mostrado na conta do Mercado Pago, não um
        // lançamento incremental.
        $account->update([
            'financial_balance_seed' => $validated['value'],
            'financial_balance_seed_updated_at' => now(),
        ]);

        AuditLogger::log($actor, 'financial.balance_seed_updated', $account, $account, ['value' => $validated['value']]);

        return response()->json($this->buildBalancePayload($account->fresh()));
    }

    public function markValidated(Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $account->update(['financial_last_validated_at' => now()]);

        AuditLogger::log($actor, 'financial.validated', $account, $account);

        return response()->json($this->buildBalancePayload($account->fresh()));
    }

    /**
     * @return array<string, mixed>
     */
    private function buildBalancePayload(Account $account): array
    {
        // O seed representa "o saldo real neste exato momento" — não faz
        // sentido somar vendas de MESES antes disso, esse dinheiro já foi
        // sacado/gasto há muito tempo e nunca esteve refletido no seed.
        // Por isso só entra na conta o que aconteceu A PARTIR da data em
        // que o saldo foi definido/reajustado pela última vez; sem seed
        // definido ainda, não há uma data de referência, então tudo fica
        // zerado (a tela já mostra "saldo inicial não definido" nesse caso).
        $since = $account->financial_balance_seed_updated_at;

        // Recalculado ao vivo, não incrementado — como Payment.status é
        // reescrito no lugar a cada sync, uma venda em mediação já some
        // daqui sozinha (status != approved) e volta sozinha se resolver a
        // favor, sem precisar de dedução manual pra isso. Por isso
        // valor_retido/estorno_valor ficam fora da fórmula: já estão
        // refletidos indiretamente no próprio sales_net_total.
        $salesNetTotal = $since
            ? Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
                ->where('status', 'approved')
                ->where('paid_at', '>=', $since)
                ->sum('net_received_amount')
            : 0;

        $purchasesTotal = $since
            ? Purchase::where('account_id', $account->id)->where('occurred_at', '>=', $since)->sum('value')
            : 0;

        // "Saídas por cancelamento": qualquer venda que não se concretizou
        // (comprou e cancelou, devolvida com desconto, peça devolvida
        // fisicamente) — só as que o usuário já conferiu (checkbox).
        $cancellationsTotal = $since
            ? OrderReturn::where('account_id', $account->id)
                ->where('verified', true)
                ->where('occurred_at', '>=', $since)
                ->whereIn('status', [
                    OrderReturn::STATUS_COMPROU_CANCELOU,
                    OrderReturn::STATUS_DESCONTO_VENDA,
                    OrderReturn::STATUS_PECAS_DEVOLVIDAS,
                ])
                ->sum('value')
            : 0;

        $freightDiscountsTotal = $since
            ? OrderReturn::where('account_id', $account->id)
                ->where('verified', true)
                ->where('occurred_at', '>=', $since)
                ->where('status', OrderReturn::STATUS_DESCONTO_FRETE)
                ->sum('value')
            : 0;

        $seed = $account->financial_balance_seed !== null ? (float) $account->financial_balance_seed : 0.0;
        $currentBalance = $seed + (float) $salesNetTotal - (float) $purchasesTotal - (float) $cancellationsTotal - (float) $freightDiscountsTotal;

        // Pendências de conferência também só fazem sentido a partir da
        // mesma data — um evento anterior ao seed não afeta mais o saldo,
        // não há motivo pra pedir conferência dele.
        $pendingReviewCount = $since
            ? OrderReturn::where('account_id', $account->id)
                ->where('verified', false)
                ->where('occurred_at', '>=', $since)
                ->count()
            : 0;

        return [
            'seed' => [
                'value' => $account->financial_balance_seed !== null ? (float) $account->financial_balance_seed : null,
                'updated_at' => $account->financial_balance_seed_updated_at?->toIso8601String(),
            ],
            'sales_net_total' => (float) $salesNetTotal,
            'purchases_total' => (float) $purchasesTotal,
            'cancellations_total' => (float) $cancellationsTotal,
            'freight_discounts_total' => (float) $freightDiscountsTotal,
            'current_balance' => $currentBalance,
            'pending_review_count' => $pendingReviewCount,
            'last_validated_at' => $account->financial_last_validated_at?->toIso8601String(),
        ];
    }
}
