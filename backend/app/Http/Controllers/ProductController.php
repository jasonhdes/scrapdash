<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Models\Account;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    /**
     * @var array<string, string>
     */
    private const SORTABLE_COLUMNS = [
        'title' => 'title',
        'seller_sku' => 'seller_sku',
        'price' => 'price',
        'available_quantity' => 'available_quantity',
        'status' => 'status',
        'completed_sales_count' => 'completed_sales_count',
    ];

    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'products']);

        $startDate = $request->date('start_date');
        $endDate = $request->date('end_date');

        $query = Product::where('account_id', $account->id)
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->string('search')->isNotEmpty(), fn ($q) => $q->where('title', 'like', '%'.$request->string('search').'%'))
            ->withSum(['orderItems as completed_sales_count' => function ($q) use ($startDate, $endDate) {
                $q->whereHas('order', function ($oq) use ($startDate, $endDate) {
                    $oq->where('status', 'paid');

                    if ($startDate) {
                        $oq->where('ordered_at', '>=', $startDate->startOfDay());
                    }

                    if ($endDate) {
                        $oq->where('ordered_at', '<=', $endDate->endOfDay());
                    }
                });
            }], 'quantity');

        $products = $this->applySort($query, $request)->paginate($request->integer('per_page', 20));

        return ProductResource::collection($products);
    }

    /**
     * @param  Builder<Product>  $query
     * @return Builder<Product>
     */
    private function applySort(Builder $query, Request $request): Builder
    {
        $sortBy = $request->string('sort_by')->toString();
        $sortDir = $request->string('sort_dir')->lower()->toString() === 'desc' ? 'desc' : 'asc';

        // "Recebe" (preço - taxa) não é uma coluna real nem um agregado do
        // withSum, então não dá pra mapear em SORTABLE_COLUMNS — precisa da
        // expressão calculada direto no ORDER BY.
        if ($sortBy === 'net_amount') {
            return $query->orderByRaw('(price - COALESCE(sale_fee_amount, 0)) '.$sortDir);
        }

        if (! array_key_exists($sortBy, self::SORTABLE_COLUMNS)) {
            return $query->orderBy('title');
        }

        return $query->orderBy(self::SORTABLE_COLUMNS[$sortBy], $sortDir);
    }

    public function show(Account $account, Product $product): ProductResource
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'products']);

        abort_if($product->account_id !== $account->id, 404);

        return new ProductResource($product);
    }

    /**
     * Atualização manual de preço/taxa via botão "Atualizar preços" — a
     * simulação de taxa de venda (uma chamada extra à API do ML por
     * anúncio) é cara demais pra rodar automaticamente a cada sync, então só
     * roda quando o usuário pede explicitamente. Síncrono de propósito: o
     * botão fica esperando a resposta pra já mostrar a lista atualizada.
     */
    public function refreshPrices(Request $request, Account $account, MercadoLivreService $mercadoLivre): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('manageModule', [$account, 'products']);

        set_time_limit(0);

        $itemIds = Product::where('account_id', $account->id)->pluck('mercadolivre_item_id')->all();
        $items = $mercadoLivre->getItemsDetails($account, $itemIds);
        $updated = 0;

        foreach ($items as $item) {
            $saleFeeAmount = null;
            if (isset($item['price'], $item['listing_type_id'], $item['category_id'])) {
                $saleFeeAmount = $mercadoLivre->getSaleFee(
                    $account,
                    (float) $item['price'],
                    $item['listing_type_id'],
                    $item['category_id'],
                );
            }

            $sellerSku = collect($item['attributes'] ?? [])->firstWhere('id', 'SELLER_SKU')['value_name'] ?? null;

            Product::where('account_id', $account->id)
                ->where('mercadolivre_item_id', $item['id'])
                ->update([
                    'title' => $item['title'] ?? '',
                    'seller_sku' => $sellerSku,
                    'price' => $item['price'] ?? null,
                    'sale_fee_amount' => $saleFeeAmount,
                    'currency' => $item['currency_id'] ?? null,
                    'available_quantity' => $item['available_quantity'] ?? 0,
                    'status' => $item['status'] ?? null,
                    'logistic_type' => $item['shipping']['logistic_type'] ?? null,
                    'permalink' => $item['permalink'] ?? null,
                    'thumbnail' => $item['thumbnail'] ?? null,
                    'synced_at' => now(),
                ]);

            $updated++;
        }

        return response()->json(['updated' => $updated]);
    }
}
