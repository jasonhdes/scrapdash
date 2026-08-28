<?php

namespace App\Http\Controllers;

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
            ->with(['order:id,mercadolivre_order_id,pack_id', 'order.returns'])
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->string('payment_method')->isNotEmpty(), fn ($q) => $q->where('payment_method', $request->string('payment_method')))
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('paid_at', '>=', $date->startOfDay()))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('paid_at', '<=', $date->endOfDay()))
            ->when($request->string('order_number')->isNotEmpty(), fn ($q) => $q->whereHas(
                'order',
                // Também busca por `pack_id`: numa compra combinada, o
                // Mercado Livre mostra pro vendedor o número do PACOTE, não
                // os números dos pedidos individuais que compõem ele — sem
                // isso, buscar pelo número que aparece na tela deles não
                // encontra nada aqui.
                fn ($oq) => $oq->where('mercadolivre_order_id', 'like', '%'.$request->string('order_number').'%')
                    ->orWhere('pack_id', 'like', '%'.$request->string('order_number').'%'),
            ));

        $payments = $this->applySort($query, $request)->paginate($request->integer('per_page', 20));

        $this->attachPackAggregates($payments->getCollection());

        return PaymentResource::collection($payments);
    }

    /**
     * Mesmo princípio de `OrderController::attachPackAggregates()`: soma
     * (aqui, o valor LÍQUIDO — essa tela trabalha em cima disso, não do
     * valor bruto do pedido) entre os pagamentos cujo pedido compartilha o
     * mesmo `pack_id`, dentro da própria página já carregada — sem query
     * extra.
     *
     * @param  \Illuminate\Support\Collection<int, Payment>  $payments
     */
    private function attachPackAggregates($payments): void
    {
        $payments->filter(fn (Payment $payment) => $payment->order?->pack_id)
            ->groupBy(fn (Payment $payment) => $payment->order->pack_id)
            ->each(function ($group) {
                $total = $group->sum('net_received_amount');
                $numbers = $group->pluck('order.mercadolivre_order_id')->values()->all();

                $group->each(function (Payment $payment) use ($total, $numbers) {
                    $payment->order->setAttribute('pack_total_amount', (float) $total);
                    $payment->order->setAttribute('pack_order_numbers', $numbers);
                });
            });
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
