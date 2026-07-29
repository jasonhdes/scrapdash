<?php

namespace App\Http\Controllers;

use App\Application\Services\AuditLogger;
use App\Http\Resources\EmployeeResource;
use App\Models\Account;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class EmployeeController extends Controller
{
    /**
     * Módulos e ações válidos pra permissão — qualquer outra coisa que o
     * cliente mande é descartada antes de gravar (nunca confia no shape
     * que veio da requisição pra decidir o que um funcionário pode fazer).
     *
     * @var array<int, string>
     */
    private const MODULES = ['products', 'orders', 'financial', 'messages'];

    /** @var array<int, string> */
    private const ACTIONS = ['view', 'manage'];

    public function index(Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('update', $account);

        return EmployeeResource::collection($account->employees()->orderBy('name')->get());
    }

    public function store(Request $request, Account $account): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('update', $account);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'permissions' => ['sometimes', 'array'],
        ]);

        $employee = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => 'user_partner',
        ]);

        $account->employees()->attach($employee->id, [
            'permissions' => $this->sanitizePermissions($validated['permissions'] ?? []),
        ]);

        AuditLogger::log($actor, 'employee.created', $account, $employee, ['email' => $employee->email]);

        return response()->json(['data' => new EmployeeResource($this->loadWithPivot($account, $employee))], 201);
    }

    public function update(Request $request, Account $account, User $employee): EmployeeResource
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('update', $account);

        abort_if($employee->role !== 'user_partner', 404);
        abort_unless($account->employees()->where('user_id', $employee->id)->exists(), 404);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
        ]);

        if (isset($validated['name'])) {
            $employee->update(['name' => $validated['name']]);
        }

        if (isset($validated['permissions'])) {
            $account->employees()->updateExistingPivot($employee->id, [
                'permissions' => $this->sanitizePermissions($validated['permissions']),
            ]);
        }

        AuditLogger::log($actor, 'employee.updated', $account, $employee);

        return new EmployeeResource($this->loadWithPivot($account, $employee));
    }

    public function destroy(Account $account, User $employee): JsonResponse
    {
        $actor = Auth::guard('api')->user();
        Gate::forUser($actor)->authorize('update', $account);

        abort_if($employee->role !== 'user_partner', 404);

        $account->employees()->detach($employee->id);

        AuditLogger::log($actor, 'employee.removed', $account, $employee, ['email' => $employee->email]);

        return response()->json(null, 204);
    }

    private function loadWithPivot(Account $account, User $employee): User
    {
        return $account->employees()->where('user_id', $employee->id)->first();
    }

    /**
     * @param  array<string, mixed>  $permissions
     * @return array<string, array<int, string>>
     */
    private function sanitizePermissions(array $permissions): array
    {
        $clean = [];

        foreach (self::MODULES as $module) {
            $given = is_array($permissions[$module] ?? null) ? $permissions[$module] : [];
            $clean[$module] = array_values(array_intersect(self::ACTIONS, $given));
        }

        return $clean;
    }
}
