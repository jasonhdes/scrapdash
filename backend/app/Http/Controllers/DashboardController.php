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

        [$startDate, $endDate] = $this->validatedDateRange($request);

        return response()->json($this->dashboard->forAccount($account, $startDate, $endDate));
    }

    public function revenueSeries(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        [$startDate, $endDate] = $this->validatedDateRange($request);

        return response()->json($this->dashboard->revenueSeries($account, $startDate, $endDate));
    }

    public function customersByState(Request $request, Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        [$startDate, $endDate] = $this->validatedDateRange($request);

        return response()->json($this->dashboard->customersByState($account, $startDate, $endDate));
    }

    /**
     * @return array{0: ?CarbonImmutable, 1: ?CarbonImmutable}
     */
    private function validatedDateRange(Request $request): array
    {
        $validated = $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        return [
            isset($validated['start_date']) ? CarbonImmutable::parse($validated['start_date']) : null,
            isset($validated['end_date']) ? CarbonImmutable::parse($validated['end_date']) : null,
        ];
    }
}
