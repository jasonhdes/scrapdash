<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Account;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
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
    ];

    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('viewModule', [$account, 'products']);

        $query = Product::where('account_id', $account->id)
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->string('search')->isNotEmpty(), fn ($q) => $q->where('title', 'like', '%'.$request->string('search').'%'));

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
}
