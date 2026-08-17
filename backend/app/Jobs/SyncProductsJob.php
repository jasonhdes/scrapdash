<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Product;
use App\Models\SyncLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncProductsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(private readonly Account $account) {}

    public function handle(MercadoLivreService $mercadoLivre): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_PRODUCTS, function () use ($mercadoLivre) {
            $itemIds = $mercadoLivre->searchItemIds($this->account);
            $items = $mercadoLivre->getItemsDetails($this->account, $itemIds);

            foreach ($items as $item) {
                // O SKU só vem no atributo SELLER_SKU quando o produto não tem
                // variações — com variações, cada uma pode ter um SKU
                // diferente e não faz sentido resumir isso num campo só.
                $sellerSku = collect($item['attributes'] ?? [])->firstWhere('id', 'SELLER_SKU')['value_name'] ?? null;

                Product::updateOrCreate(
                    ['mercadolivre_item_id' => $item['id']],
                    [
                        'account_id' => $this->account->id,
                        'title' => $item['title'] ?? '',
                        'seller_sku' => $sellerSku,
                        'price' => $item['price'] ?? null,
                        'currency' => $item['currency_id'] ?? null,
                        'available_quantity' => $item['available_quantity'] ?? 0,
                        'status' => $item['status'] ?? null,
                        'logistic_type' => $item['shipping']['logistic_type'] ?? null,
                        'permalink' => $item['permalink'] ?? null,
                        'thumbnail' => $item['thumbnail'] ?? null,
                        'synced_at' => now(),
                    ],
                );
            }

            return count($items);
        });
    }
}
