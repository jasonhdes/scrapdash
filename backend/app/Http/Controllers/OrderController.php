<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\Account;
use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrderController extends Controller
{
    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $orders = $this->filteredQuery($request, $account)
            ->with('approvedPayment')
            ->orderByDesc('ordered_at')
            ->paginate($request->integer('per_page', 20));

        return OrderResource::collection($orders);
    }

    public function show(Account $account, Order $order): OrderResource
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        abort_if($order->account_id !== $account->id, 404);

        return new OrderResource($order->load('payments', 'approvedPayment'));
    }

    public function markProcessed(Request $request, Account $account, Order $order): OrderResource
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('update', $account);

        abort_if($order->account_id !== $account->id, 404);

        $validated = $request->validate(['processed' => ['required', 'boolean']]);

        $order->update(['processed_at' => $validated['processed'] ? now() : null]);

        return new OrderResource($order);
    }

    public function export(Request $request, Account $account): StreamedResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $orders = $this->filteredQuery($request, $account)
            ->with('approvedPayment')
            ->orderByDesc('ordered_at')
            ->get();

        $filename = 'pedidos-'.$account->id.'-'.now()->format('Y-m-d_His').'.csv';

        return response()->streamDownload(function () use ($orders) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF"); // BOM para acentuação abrir certo no Excel
            fputcsv($handle, ['Pedido ML', 'Status', 'Valor total', 'Moeda', 'Comprador', 'Data do pedido', 'Processado em', 'Liberação do dinheiro']);

            foreach ($orders as $order) {
                fputcsv($handle, [
                    $order->mercadolivre_order_id,
                    $order->status,
                    $order->total_amount,
                    $order->currency,
                    $order->buyer_nickname,
                    $order->ordered_at?->toDateTimeString(),
                    $order->processed_at?->toDateTimeString(),
                    $order->approvedPayment?->money_release_date?->toDateTimeString(),
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
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->has('processed'), fn ($q) => $q->when(
                $request->boolean('processed'),
                fn ($q) => $q->whereNotNull('processed_at'),
                fn ($q) => $q->whereNull('processed_at'),
            ))
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('ordered_at', '>=', $date->startOfDay()))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('ordered_at', '<=', $date->endOfDay()));
    }
}
