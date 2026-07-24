<?php

namespace App\Http\Controllers;

use App\Application\Services\DashboardService;
use App\Models\Account;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class DashboardController extends Controller
{
    public function __construct(private readonly DashboardService $dashboard) {}

    public function show(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $startDate = isset($validated['start_date']) ? CarbonImmutable::parse($validated['start_date']) : null;
        $endDate = isset($validated['end_date']) ? CarbonImmutable::parse($validated['end_date']) : null;

        return response()->json($this->dashboard->forAccount($account, $startDate, $endDate));
    }
}
