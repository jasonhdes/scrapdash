<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\Account;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    /**
     * Colunas que dá pra ordenar — allowlist pra não deixar o front mandar
     * qualquer nome de coluna arbitrário pro ORDER BY.
     *
     * @var array<string, string>
     */
    private const SORTABLE_COLUMNS = [
        'ordered_at' => 'ordered_at',
        'total_amount' => 'total_amount',
        'mercadolivre_order_id' => 'mercadolivre_order_id',
        'buyer_nickname' => 'buyer_nickname',
        'status' => 'status',
        'money_release_date' => 'money_release_date',
    ];

    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $orders = $this->applySort($this->filteredQuery($request, $account), $request)
            ->with('approvedPayment', 'items')
            ->paginate($request->integer('per_page', 20));

        return OrderResource::collection($orders);
    }

    /**
     * SKUs distintos já vendidos por essa conta, pra alimentar o filtro de
     * seleção múltipla de produto na listagem (estilo Excel).
     */
    public function skuOptions(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $skus = OrderItem::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->whereNotNull('seller_sku')
            ->selectRaw('seller_sku, max(title) as title')
            ->groupBy('seller_sku')
            ->orderBy('seller_sku')
            ->get()
            ->map(fn ($item) => ['sku' => $item->seller_sku, 'title' => $item->title]);

        return response()->json(['data' => $skus]);
    }

    public function show(Account $account, Order $order): OrderResource
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        abort_if($order->account_id !== $account->id, 404);

        return new OrderResource($order->load('payments', 'approvedPayment', 'items'));
    }

    public function markProcessed(Request $request, Account $account, Order $order): OrderResource
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('update', $account);

        abort_if($order->account_id !== $account->id, 404);

        $validated = $request->validate(['processed' => ['required', 'boolean']]);

        $order->update(['processed_at' => $validated['processed'] ? now() : null]);

        return new OrderResource($order->load('payments', 'approvedPayment', 'items'));
    }

    public function export(Request $request, Account $account): StreamedResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $orders = $this->applySort($this->filteredQuery($request, $account), $request)
            ->with('approvedPayment')
            ->get();

        $filename = 'pedidos-'.$account->id.'-'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($orders) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // BOM para acentuação abrir certo no Excel
            fputcsv($handle, ['Pedido ML', 'Status', 'Valor total', 'Moeda', 'Comprador', 'Cidade', 'Estado', 'Data do pedido', 'Processado em', 'Liberação do dinheiro']);

            foreach ($orders as $order) {
                fputcsv($handle, [
                    $order->mercadolivre_order_id,
                    $order->status,
                    $order->total_amount,
                    $order->currency,
                    $order->buyer_nickname,
                    $order->buyer_city,
                    $order->buyer_state,
                    $order->ordered_at?->clone()->setTimezone('America/Sao_Paulo')->toDateTimeString(),
                    $order->processed_at?->clone()->setTimezone('America/Sao_Paulo')->toDateTimeString(),
                    $order->approvedPayment?->money_release_date?->clone()->setTimezone('America/Sao_Paulo')->toDateTimeString(),
                ]);
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    /**
     * @return Builder<Order>
     */
    private function filteredQuery(Request $request, Account $account): Builder
    {
        return Order::where('account_id', $account->id)
            ->when($request->string('order_number')->isNotEmpty(), fn ($q) => $q->where(
                'mercadolivre_order_id', 'like', '%'.$request->string('order_number').'%',
            ))
            ->when($request->string('buyer')->isNotEmpty(), fn ($q) => $q->where(
                'buyer_nickname', 'like', '%'.$request->string('buyer').'%',
            ))
            ->when($request->filled('min_total'), fn ($q) => $q->where('total_amount', '>=', $request->float('min_total')))
            ->when($request->filled('max_total'), fn ($q) => $q->where('total_amount', '<=', $request->float('max_total')))
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('ordered_at', '>=', $date->startOfDay()))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('ordered_at', '<=', $date->endOfDay()))
            ->when($request->has('released'), fn ($q) => $q->when(
                $request->boolean('released'),
                fn ($q) => $q->whereHas('approvedPayment', fn ($q) => $q->where('released', true)),
                fn ($q) => $q->where(fn ($q) => $q->whereDoesntHave('approvedPayment')
                    ->orWhereHas('approvedPayment', fn ($q) => $q->where('released', false))),
            ))
            ->when($request->has('processed'), fn ($q) => $q->when(
                $request->boolean('processed'),
                fn ($q) => $q->whereNotNull('processed_at'),
                fn ($q) => $q->whereNull('processed_at'),
            ))
            ->when($request->string('product')->isNotEmpty(), fn ($q) => $q->whereHas('items', fn ($q) => $q
                ->where('title', 'like', '%'.$request->string('product').'%')
                ->orWhere('seller_sku', 'like', '%'.$request->string('product').'%')))
            ->when(count($request->array('skus')) > 0, fn ($q) => $q->whereHas(
                'items', fn ($q) => $q->whereIn('seller_sku', $request->array('skus')),
            ))
            ->when($request->string('location')->isNotEmpty(), fn ($q) => $q->where(fn ($q) => $q
                ->where('buyer_city', 'like', '%'.$request->string('location').'%')
                ->orWhere('buyer_state', 'like', '%'.$request->string('location').'%')));
    }

    /**
     * Ordenação estilo "clicar no cabeçalho da coluna, como no Excel" — por
     * padrão mantém o comportamento de sempre (mais recentes primeiro).
     *
     * @param  Builder<Order>  $query
     * @return Builder<Order>
     */
    private function applySort(Builder $query, Request $request): Builder
    {
        $sortBy = $request->string('sort_by')->toString();
        $sortDir = $request->string('sort_dir')->lower()->toString() === 'asc' ? 'asc' : 'desc';

        if (! array_key_exists($sortBy, self::SORTABLE_COLUMNS)) {
            return $query->orderByDesc('ordered_at');
        }

        if ($sortBy === 'money_release_date') {
            // Não dá pra ordenar direto por uma relação hasOne->latestOfMany
            // sem join; uma subquery correlacionada resolve isso mantendo a
            // mesma regra do `approvedPayment` (último pagamento aprovado).
            $releaseDateSubquery = Payment::select('money_release_date')
                ->whereColumn('payments.order_id', 'orders.id')
                ->where('status', 'approved')
                ->orderByDesc('id')
                ->limit(1);

            // Pedido sem pagamento aprovado ainda (data nula) não é "o
            // próximo a receber" — manda pro fim da lista nos dois sentidos,
            // em vez de aparecer primeiro (comportamento padrão do MySQL pra
            // ASC, onde NULL conta como o menor valor possível).
            return $query
                ->orderByRaw('('.$releaseDateSubquery->toSql().') is null', $releaseDateSubquery->getBindings())
                ->orderBy($releaseDateSubquery, $sortDir);
        }

        return $query->orderBy(self::SORTABLE_COLUMNS[$sortBy], $sortDir);
    }
}
