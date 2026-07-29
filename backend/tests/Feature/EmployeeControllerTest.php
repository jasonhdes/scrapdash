<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_update_and_remove_an_employee(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $token = auth('api')->login($owner);
        $headers = ['Authorization' => "Bearer {$token}"];

        $create = $this->postJson("/api/accounts/{$account->id}/employees", [
            'name' => 'Funcionária Teste',
            'email' => 'funcionaria@example.com',
            'password' => 'senha12345',
            'permissions' => ['products' => ['view'], 'orders' => ['view', 'manage']],
        ], $headers);

        $create->assertStatus(201)
            ->assertJsonPath('data.email', 'funcionaria@example.com')
            ->assertJsonPath('data.permissions.products', ['view'])
            ->assertJsonPath('data.permissions.orders', ['view', 'manage'])
            ->assertJsonPath('data.permissions.financial', [])
            ->assertJsonPath('data.permissions.messages', []);

        $employeeId = $create->json('data.id');
        $employee = User::find($employeeId);
        $this->assertSame('user_partner', $employee->role);

        $update = $this->patchJson("/api/accounts/{$account->id}/employees/{$employeeId}", [
            'permissions' => ['financial' => ['view']],
        ], $headers);

        $update->assertStatus(200)->assertJsonPath('data.permissions.financial', ['view']);

        $this->deleteJson("/api/accounts/{$account->id}/employees/{$employeeId}", [], $headers)
            ->assertStatus(204);

        $this->getJson("/api/accounts/{$account->id}/employees", $headers)
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        // O usuário continua existindo (só o acesso à conta foi removido).
        $this->assertNotNull(User::find($employeeId));

        $this->assertSame(
            ['employee.created', 'employee.updated', 'employee.removed'],
            AuditLog::where('subject_type', User::class)->where('subject_id', $employeeId)
                ->orderBy('id')->pluck('action')->all(),
        );
    }

    public function test_permissions_sent_by_the_client_are_sanitized_to_known_modules_and_actions(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $token = auth('api')->login($owner);

        $response = $this->postJson("/api/accounts/{$account->id}/employees", [
            'name' => 'Funcionária Teste',
            'email' => 'funcionaria2@example.com',
            'password' => 'senha12345',
            'permissions' => [
                'products' => ['view', 'delete_everything'],
                'nao_existe' => ['manage'],
            ],
        ], ['Authorization' => "Bearer {$token}"]);

        $response->assertStatus(201)
            ->assertJsonPath('data.permissions.products', ['view'])
            ->assertJsonMissingPath('data.permissions.nao_existe');
    }

    public function test_employee_email_must_be_unique_across_the_system(): void
    {
        User::factory()->create(['email' => 'ja.existe@example.com']);

        $owner = User::factory()->create(['role' => 'user']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $token = auth('api')->login($owner);

        $this->postJson("/api/accounts/{$account->id}/employees", [
            'name' => 'Funcionária Teste',
            'email' => 'ja.existe@example.com',
            'password' => 'senha12345',
            'permissions' => [],
        ], ['Authorization' => "Bearer {$token}"])->assertStatus(422);
    }
}
