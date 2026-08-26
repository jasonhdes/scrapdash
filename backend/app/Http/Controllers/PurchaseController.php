<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Http\Resources\PurchaseResource;
use App\Models\Account;
use App\Models\Purchase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class PurchaseController extends Controller
{
    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'financial']);

        $purchases = Purchase::where('account_id', $account->id)
            ->when($request->date('start_date'), fn ($q, $date) => $q->where('occurred_at', '>=', $date))
            ->when($request->date('end_date'), fn ($q, $date) => $q->where('occurred_at', '<=', $date))
            ->orderByDesc('occurred_at')
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 20));

        return PurchaseResource::collection($purchases);
    }

    public function store(Request $request, Account $account): PurchaseResource
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        $validated = $request->validate([
            'occurred_at' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'value' => ['required', 'numeric', 'min:0.01'],
        ]);

        $purchase = Purchase::create([
            ...$validated,
            'account_id' => $account->id,
        ]);

        AuditLogger::log($actor, 'purchase.created', $account, $purchase);

        return new PurchaseResource($purchase);
    }

    public function destroy(Account $account, Purchase $purchase): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('manageModule', [$account, 'financial']);

        abort_if($purchase->account_id !== $account->id, 404);

        $purchase->delete();

        AuditLogger::log($actor, 'purchase.deleted', $account, $purchase);

        return response()->json(['deleted' => true]);
    }
}
