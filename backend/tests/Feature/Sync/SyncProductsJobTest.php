<?php

namespace Tests\Feature\Sync;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\SyncProductsJob;
use App\Models\Account;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SyncProductsJobTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_products_from_the_mercadolivre_api_response(): void
    {
        $owner = User::factory()->create();
        $account = Account::create([
            'user_id' => $owner->id,
            'name' => 'Conta',
            'marketplace' => 'mercado_livre',
            'mercadolivre_user_id' => '999888777',
            'mercadolivre_access_token' => 'token-de-teste',
            'mercadolivre_refresh_token' => 'refresh-de-teste',
            'mercadolivre_token_expires_at' => now()->addHours(6),
        ]);

        Http::fake([
            '*/users/999888777/items/search*' => Http::response([
                'results' => ['MLB1', 'MLB2'],
                'paging' => ['total' => 2],
            ]),
            '*/items*' => Http::response([
                [
                    'code' => 200,
                    'body' => [
                        'id' => 'MLB1',
                        'title' => 'Produto Um',
                        'price' => 50.5,
                        'currency_id' => 'BRL',
                        'available_quantity' => 3,
                        'status' => 'active',
                        'permalink' => 'https://produto.mercadolivre.com.br/MLB1',
                        'thumbnail' => 'https://img.example.com/mlb1.jpg',
                        'attributes' => [
                            ['id' => 'SELLER_SKU', 'value_name' => 'SKU-001'],
                        ],
                    ],
                ],
                [
                    'code' => 200,
                    'body' => [
                        'id' => 'MLB2',
                        'title' => 'Produto Dois',
                        'price' => 75,
                        'currency_id' => 'BRL',
                        'available_quantity' => 0,
                        'status' => 'paused',
                        'permalink' => 'https://produto.mercadolivre.com.br/MLB2',
                        'thumbnail' => null,
                        'attributes' => [],
                    ],
                ],
            ]),
        ]);

        (new SyncProductsJob($account))->handle(app(MercadoLivreService::class));

        $this->assertSame(2, Product::where('account_id', $account->id)->count());

        $product1 = Product::where('mercadolivre_item_id', 'MLB1')->firstOrFail();
        $this->assertSame('Produto Um', $product1->title);
        $this->assertSame('SKU-001', $product1->seller_sku);
        $this->assertSame('active', $product1->status);

        $product2 = Product::where('mercadolivre_item_id', 'MLB2')->firstOrFail();
        $this->assertNull($product2->seller_sku);
        $this->assertSame('paused', $product2->status);
    }

    public function test_re_running_the_job_updates_existing_products_instead_of_duplicating(): void
    {
        $owner = User::factory()->create();
        $account = Account::create([
            'user_id' => $owner->id,
            'name' => 'Conta',
            'marketplace' => 'mercado_livre',
            'mercadolivre_user_id' => '999888777',
            'mercadolivre_access_token' => 'token-de-teste',
        ]);

        // Produto já existente localmente com dados desatualizados — o job
        // deve casar pelo mercadolivre_item_id e atualizar, não duplicar.
        Product::create([
            'account_id' => $account->id,
            'mercadolivre_item_id' => 'MLB1',
            'title' => 'Preço antigo',
            'price' => 10,
            'available_quantity' => 5,
            'status' => 'active',
        ]);

        Http::fake([
            '*/users/999888777/items/search*' => Http::response([
                'results' => ['MLB1'],
                'paging' => ['total' => 1],
            ]),
            '*/items*' => Http::response([
                ['code' => 200, 'body' => ['id' => 'MLB1', 'title' => 'Preço novo', 'price' => 20, 'available_quantity' => 1, 'status' => 'active']],
            ]),
        ]);

        (new SyncProductsJob($account))->handle(app(MercadoLivreService::class));

        $this->assertSame(1, Product::where('account_id', $account->id)->count());
        $this->assertSame('Preço novo', Product::first()->title);
        $this->assertEquals(20, Product::first()->price);
    }
}
