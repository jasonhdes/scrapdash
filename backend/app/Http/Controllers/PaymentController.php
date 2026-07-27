<?php

namespace App\Http\Controllers;

use App\Http\Resources\PaymentResource;
use App\Models\Account;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class PaymentController extends Controller
{
    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $payments = Payment::whereHas('order', fn ($q) => $q->where('account_id', $account->id))
            ->with('order:id,mercadolivre_order_id')
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->string('payment_method')->isNotEmpty(), fn ($q) => $q->where('payment_method', $request->string('payment_method')))
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('paid_at', '>=', $date->startOfDay()))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('paid_at', '<=', $date->endOfDay()))
            ->orderByDesc('paid_at')
            ->paginate($request->integer('per_page', 20));

        return PaymentResource::collection($payments);
    }
}
