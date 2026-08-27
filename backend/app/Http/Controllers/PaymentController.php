<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Http\Resources\PaymentResource;
use App\Models\Account;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class PaymentController extends Controller
{
    /**
     * Colunas que dá pra ordenar — allowlist pra não deixar o front mandar
     * qualquer nome de coluna arbitrário pro ORDER BY.
     *
     * @var array<string, string>
     */
    private const SORTABLE_COLUMNS = [
        'paid_at' => 'paid_at',
        'net_received_amount' => 'net_received_amount',
        'status' => 'status',
        'money_release_date' => 'money_release_date',
        'mercadolivre_order_id' => 'mercadolivre_order_id',
    ];

    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        $query = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->with('order:id,mercadolivre_order_id')
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->string('payment_method')->isNotEmpty(), fn ($q) => $q->where('payment_method', $request->string('payment_method')))
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('paid_at', '>=', $date->startOfDay()))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('paid_at', '<=', $date->endOfDay()))
            ->when($request->string('order_number')->isNotEmpty(), fn ($q) => $q->whereHas(
                'order',
                fn ($oq) => $oq->where('mercadolivre_order_id', 'like', '%'.$request->string('order_number').'%'),
            ));

        $payments = $this->applySort($query, $request)->paginate($request->integer('per_page', 20));

        return PaymentResource::collection($payments);
    }

    /**
     * Confirmação manual de liberação — checkbox "Liberado" na lista do
     * Financeiro. O status de liberação normalmente vem da sincronização
     * automática, mas a estimativa do Mercado Pago pode atrasar; isso dá
     * ao usuário controle direto pra corrigir o que já sabe que caiu na
     * conta (ou reverter uma marcação errada), e "A receber"/"Recebido"
     * passam a refletir esse valor imediatamente — não têm mais nenhuma
     * outra fonte além deste campo.
     */
    public function update(Request $request, Account $account, Payment $payment): PaymentResource
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        abort_if($payment->order?->account_id !== $account->id, 404);

        $validated = $request->validate([
            'released' => ['required', 'boolean'],
        ]);

        $payment->update($validated);

        AuditLogger::log($actor, 'payment.released_updated', $account, $payment, $validated);

        return new PaymentResource($payment->load('order:id,mercadolivre_order_id'));
    }

    /**
     * @param  Builder<Payment>  $query
     * @return Builder<Payment>
     */
    private function applySort(Builder $query, Request $request): Builder
    {
        $sortBy = $request->string('sort_by')->toString();
        $sortDir = $request->string('sort_dir')->lower()->toString() === 'asc' ? 'asc' : 'desc';

        if (! array_key_exists($sortBy, self::SORTABLE_COLUMNS)) {
            return $query->orderByDesc('paid_at');
        }

        if ($sortBy === 'mercadolivre_order_id') {
            // "Pedido" não é coluna de payments — precisa do join pra
            // ordenar pelo número do pedido relacionado.
            return $query
                ->join('orders', 'orders.id', '=', 'payments.order_id')
                ->orderBy('orders.mercadolivre_order_id', $sortDir)
                ->select('payments.*');
        }

        return $query->orderBy(self::SORTABLE_COLUMNS[$sortBy], $sortDir);
    }
}
