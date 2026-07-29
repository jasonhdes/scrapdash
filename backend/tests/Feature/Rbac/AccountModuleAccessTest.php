<?php

namespace Tests\Feature\Rbac;

use App\Models\Account;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountModuleAccessTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsUser(User $user): string
    {
        return auth('api')->login($user);
    }

    public function test_owner_can_view_products_of_own_account(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        Product::create([
            'account_id' => $account->id,
            'mercadolivre_item_id' => 'MLB1',
            'title' => 'Produto teste',
            'available_quantity' => 1,
        ]);

        $token = $this->actingAsUser($owner);

        $this->getJson("/api/accounts/{$account->id}/products", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200)
            ->assertJsonCount(1, 'data');
    }

    public function test_owner_cannot_access_another_owners_account(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $stranger = User::factory()->create(['role' => 'user']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);

        $token = $this->actingAsUser($stranger);

        $this->getJson("/api/accounts/{$account->id}/products", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    public function test_master_can_access_any_account(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $master = User::factory()->create(['role' => 'master']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);

        $token = $this->actingAsUser($master);

        $this->getJson("/api/accounts/{$account->id}/products", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);
    }

    public function test_user_partner_without_module_permission_is_forbidden(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $partner = User::factory()->create(['role' => 'user_partner']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $account->employees()->attach($partner->id, ['permissions' => ['products' => ['view']]]);

        $token = $this->actingAsUser($partner);

        $this->getJson("/api/accounts/{$account->id}/financial/summary", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    public function test_user_partner_with_view_permission_can_view_but_not_manage(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $partner = User::factory()->create(['role' => 'user_partner']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $account->employees()->attach($partner->id, ['permissions' => ['orders' => ['view']]]);
        $order = Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '2000000000001',
            'status' => 'paid',
            'total_amount' => 100,
        ]);

        $token = $this->actingAsUser($partner);

        $this->getJson("/api/accounts/{$account->id}/orders", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200);

        // "view" não inclui "manage" — marcar como processado deve continuar bloqueado.
        $this->patchJson(
            "/api/accounts/{$account->id}/orders/{$order->id}/processed",
            ['processed' => true],
            ['Authorization' => "Bearer {$token}"],
        )->assertStatus(403);
    }

    public function test_user_partner_not_assigned_to_the_account_cannot_see_it_at_all(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $partner = User::factory()->create(['role' => 'user_partner']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        // Funcionário nunca foi atribuído a essa conta.

        $token = $this->actingAsUser($partner);

        $this->getJson('/api/accounts', ['Authorization' => "Bearer {$token}"])
            ->assertStatus(200)
            ->assertJsonCount(0, 'data');

        $this->getJson("/api/accounts/{$account->id}/products", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }

    public function test_only_account_owner_or_master_can_manage_employees(): void
    {
        $owner = User::factory()->create(['role' => 'user']);
        $partner = User::factory()->create(['role' => 'user_partner']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $account->employees()->attach($partner->id, ['permissions' => ['products' => ['view', 'manage']]]);

        $token = $this->actingAsUser($partner);

        // Mesmo com "manage" em produtos, funcionário não gerencia a equipe.
        $this->getJson("/api/accounts/{$account->id}/employees", ['Authorization' => "Bearer {$token}"])
            ->assertStatus(403);
    }
}
