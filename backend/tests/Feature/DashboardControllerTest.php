<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardControllerTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsOwner(): array
    {
        $owner = User::factory()->create(['role' => 'user']);
        $account = Account::create(['user_id' => $owner->id, 'name' => 'Conta', 'marketplace' => 'mercado_livre']);
        $token = auth('api')->login($owner);

        return [$account, ['Authorization' => "Bearer {$token}"]];
    }

    public function test_revenue_series_defaults_to_the_last_30_days_with_gapless_dates(): void
    {
        [$account, $headers] = $this->actingAsOwner();

        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '1',
            'status' => 'paid',
            'total_amount' => 100,
            'currency' => 'BRL',
            'ordered_at' => now(),
        ]);

        // Fora da janela padrão de 30 dias — não deve entrar na série.
        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '2',
            'status' => 'paid',
            'total_amount' => 500,
            'currency' => 'BRL',
            'ordered_at' => now()->subDays(60),
        ]);

        // Pedido cancelado — não deve contar como receita.
        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '3',
            'status' => 'cancelled',
            'total_amount' => 999,
            'currency' => 'BRL',
            'ordered_at' => now(),
        ]);

        $response = $this->getJson("/api/accounts/{$account->id}/dashboard/revenue-series", $headers);

        $response->assertStatus(200)->assertJsonPath('currency', 'BRL');
        $series = $response->json('series');

        $this->assertCount(30, $series);
        $this->assertEquals(100, $series[array_key_last($series)]['revenue']);
        $this->assertEquals(0, $series[0]['revenue']);
    }

    public function test_revenue_series_respects_an_explicit_date_range(): void
    {
        [$account, $headers] = $this->actingAsOwner();

        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '1',
            'status' => 'paid',
            'total_amount' => 50,
            'currency' => 'BRL',
            'ordered_at' => '2026-01-05 10:00:00',
        ]);

        $response = $this->getJson(
            "/api/accounts/{$account->id}/dashboard/revenue-series?start_date=2026-01-01&end_date=2026-01-07",
            $headers,
        );

        $response->assertStatus(200)
            ->assertJsonPath('period.start_date', '2026-01-01')
            ->assertJsonPath('period.end_date', '2026-01-07');

        $series = collect($response->json('series'))->keyBy('date');
        $this->assertCount(7, $series);
        $this->assertEquals(50, $series['2026-01-05']['revenue']);
        $this->assertEquals(0, $series['2026-01-01']['revenue']);
    }

    public function test_customers_by_state_groups_orders_and_ignores_unsynced_addresses(): void
    {
        [$account, $headers] = $this->actingAsOwner();

        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '1',
            'status' => 'paid',
            'total_amount' => 10,
            'buyer_state' => 'São Paulo',
        ]);
        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '2',
            'status' => 'paid',
            'total_amount' => 10,
            'buyer_state' => 'São Paulo',
        ]);
        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '3',
            'status' => 'paid',
            'total_amount' => 10,
            'buyer_state' => 'Bahia',
        ]);
        // Endereço ainda não sincronizado — deve ficar fora do agrupamento.
        Order::create([
            'account_id' => $account->id,
            'mercadolivre_order_id' => '4',
            'status' => 'paid',
            'total_amount' => 10,
        ]);

        $response = $this->getJson("/api/accounts/{$account->id}/dashboard/customers-by-state", $headers);

        $response->assertStatus(200);
        $this->assertSame(
            [
                ['state' => 'São Paulo', 'total' => 2],
                ['state' => 'Bahia', 'total' => 1],
            ],
            $response->json('data'),
        );
    }

    public function test_a_stranger_cannot_access_another_owners_series_endpoints(): void
    {
        [$account] = $this->actingAsOwner();
        $stranger = User::factory()->create(['role' => 'user']);
        $token = auth('api')->login($stranger);
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->getJson("/api/accounts/{$account->id}/dashboard/revenue-series", $headers)->assertStatus(403);
        $this->getJson("/api/accounts/{$account->id}/dashboard/customers-by-state", $headers)->assertStatus(403);
    }
}
