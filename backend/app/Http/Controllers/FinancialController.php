<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Models\Account;
use App\Models\FinancialPeriod;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class FinancialController extends Controller
{
    /**
     * Campos que o usuário pode editar diretamente num período aberto —
     * allowlist pra não deixar o front mandar qualquer coluna arbitrária.
     *
     * @var array<int, string>
     */
    private const EDITABLE_FIELDS = [
        'previous_balance',
        'total_sales',
        'held_balance',
        'refunded_balance',
        'discounts',
    ];

    /**
     * @var array<int, string>
     */
    private const MERCADOPAGO_FIELDS = [
        'pending_balance',
        'available_balance',
    ];

    public function periods(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        $current = $this->currentPeriod($account);
        $previous = FinancialPeriod::where('account_id', $account->id)
            ->whereNotNull('closed_at')
            ->orderByDesc('closed_at')
            ->first();

        return response()->json([
            'current' => $this->present($current),
            'previous' => $previous ? $this->present($previous) : null,
            'mercadopago' => [
                'pending_balance' => $account->mercadopago_pending_balance !== null ? (float) $account->mercadopago_pending_balance : null,
                'available_balance' => $account->mercadopago_available_balance !== null ? (float) $account->mercadopago_available_balance : null,
            ],
        ]);
    }

    /**
     * Os dois valores digitados manualmente conferindo o Mercado Pago —
     * "a receber" e "disponível" — usados só pra calcular a diferença
     * contra o "Saldo atual" calculado aqui, não pra nenhum outro cálculo.
     */
    public function updateMercadoPagoField(Request $request, Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $validated = $request->validate([
            'field' => ['required', 'string', 'in:'.implode(',', self::MERCADOPAGO_FIELDS)],
            'value' => ['required', 'numeric'],
        ]);

        $account->update(['mercadopago_'.$validated['field'] => $validated['value']]);

        AuditLogger::log($actor, 'account.mercadopago_balance_updated', $account, $account, $validated);

        return $this->periods($account);
    }

    public function updatePeriodField(Request $request, Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $validated = $request->validate([
            'field' => ['required', 'string', 'in:'.implode(',', self::EDITABLE_FIELDS)],
            'value' => ['required', 'numeric'],
        ]);

        $period = $this->currentPeriod($account);
        $period->update([$validated['field'] => $validated['value']]);

        AuditLogger::log($actor, 'financial_period.field_updated', $account, $period, $validated);

        return $this->periods($account);
    }

    /**
     * Recalcula "total de vendas" a partir dos pagamentos reais desde a
     * abertura do período — sobrescreve o que estiver guardado, mesmo que
     * tenha sido editado manualmente antes.
     */
    public function refreshSales(Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $period = $this->currentPeriod($account);

        $totalSales = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->where('status', 'approved')
            ->where('paid_at', '>=', $period->created_at)
            ->sum('net_received_amount');

        $period->update(['total_sales' => $totalSales]);

        AuditLogger::log($actor, 'financial_period.sales_refreshed', $account, $period, ['total_sales' => (float) $totalSales]);

        return $this->periods($account);
    }

    /**
     * Recalcula "saldo retido", "saldo reembolsado" e "descontos" a partir
     * das atualizações de devolução (valor_retido/estorno_valor/
     * desconto_venda+desconto_frete) registradas nos pedidos desde a
     * abertura do período — sobrescreve o que estiver guardado, mesmo
     * editado manualmente antes. Os 3 campos continuam editáveis à mão
     * depois: isso só puxa o valor somado pra dentro deles.
     */
    public function refreshReturns(Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $period = $this->currentPeriod($account);

        $values = [
            'held_balance' => $period->computedHeldBalance(),
            'refunded_balance' => $period->computedRefundedBalance(),
            'discounts' => $period->computedDiscounts(),
        ];

        $period->update($values);

        AuditLogger::log($actor, 'financial_period.returns_refreshed', $account, $period, $values);

        return $this->periods($account);
    }

    /**
     * Fecha o período aberto (congela como histórico) e abre um novo,
     * herdando o saldo final do anterior como seu "saldo anterior".
     */
    public function closePeriod(Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $period = $this->currentPeriod($account);

        DB::transaction(function () use ($account, $period) {
            $endingBalance = $period->endingBalance();

            $period->update(['closed_at' => now()]);

            FinancialPeriod::create([
                'account_id' => $account->id,
                'previous_balance' => $endingBalance,
            ]);
        });

        AuditLogger::log($actor, 'financial_period.closed', $account, $period);

        return $this->periods($account);
    }

    /**
     * O período aberto da conta — cria um automaticamente se ainda não
     * existir nenhum (conta nova).
     */
    private function currentPeriod(Account $account): FinancialPeriod
    {
        return FinancialPeriod::where('account_id', $account->id)
            ->whereNull('closed_at')
            ->first()
            ?? FinancialPeriod::create(['account_id' => $account->id]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(FinancialPeriod $period): array
    {
        return [
            'previous_balance' => (float) $period->previous_balance,
            'total_sales' => $period->totalSalesForDisplay(),
            'held_balance' => (float) $period->held_balance,
            'refunded_balance' => (float) $period->refunded_balance,
            'discounts' => (float) $period->discounts,
            'despesas' => $period->despesas(),
            'ending_balance' => $period->endingBalance(),
            'created_at' => $period->created_at?->toIso8601String(),
            'closed_at' => $period->closed_at?->toIso8601String(),
        ];
    }
}
