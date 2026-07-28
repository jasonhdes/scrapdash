<?php

namespace App\Http\Controllers;

use App\Models\Account;
use App\Models\Order;
use App\Models\Payment;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class FinancialController extends Controller
{
    public function summary(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $startDate = isset($validated['start_date']) ? CarbonImmutable::parse($validated['start_date']) : null;
        $endDate = isset($validated['end_date']) ? CarbonImmutable::parse($validated['end_date']) : null;

        $base = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->when($startDate, fn ($q) => $q->where('paid_at', '>=', $startDate->startOfDay()))
            ->when($endDate, fn ($q) => $q->where('paid_at', '<=', $endDate->endOfDay()));

        $byStatus = (clone $base)
            ->selectRaw('status, count(*) as total, sum(transaction_amount) as amount')
            ->groupBy('status')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->status => ['total' => (int) $row->total, 'amount' => (float) $row->amount]]);

        $byMethod = (clone $base)
            ->where('status', 'approved')
            ->selectRaw('payment_method, count(*) as total, sum(transaction_amount) as amount')
            ->groupBy('payment_method')
            ->get()
            ->mapWithKeys(fn ($row) => [$row->payment_method ?? 'desconhecido' => ['total' => (int) $row->total, 'amount' => (float) $row->amount]]);

        $totalReceived = (clone $base)->where('status', 'approved')->sum('transaction_amount');

        return response()->json([
            'period' => [
                'start_date' => $startDate?->toDateString(),
                'end_date' => $endDate?->toDateString(),
            ],
            'total_received' => (float) $totalReceived,
            'by_status' => $byStatus,
            'by_method' => $byMethod,
        ]);
    }

    public function reconciliation(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $mismatches = Order::where('account_id', $account->id)
            ->where('status', 'paid')
            ->withSum(['payments as approved_amount' => fn ($q) => $q->where('status', 'approved')], 'transaction_amount')
            ->get()
            ->map(function (Order $order) {
                $approvedAmount = (float) ($order->approved_amount ?? 0);

                return [
                    'order_id' => $order->id,
                    'mercadolivre_order_id' => $order->mercadolivre_order_id,
                    'ordered_at' => $order->ordered_at,
                    'order_total' => (float) $order->total_amount,
                    'approved_amount' => $approvedAmount,
                    'difference' => round((float) $order->total_amount - $approvedAmount, 2),
                ];
            })
            ->filter(fn (array $row) => abs($row['difference']) > 0.01)
            ->sortByDesc(fn (array $row) => abs($row['difference']))
            ->values();

        return response()->json([
            'data' => $mismatches,
            'meta' => ['total' => $mismatches->count()],
        ]);
    }
}
