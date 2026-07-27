<?php

namespace App\Http\Controllers;

use App\Http\Resources\ProductResource;
use App\Models\Account;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ProductController extends Controller
{
    public function index(Request $request, Account $account): AnonymousResourceCollection
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $products = Product::where('account_id', $account->id)
            ->when($request->string('status')->isNotEmpty(), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->string('search')->isNotEmpty(), fn ($q) => $q->where('title', 'like', '%'.$request->string('search').'%'))
            ->orderBy('title')
            ->paginate($request->integer('per_page', 20));

        return ProductResource::collection($products);
    }

    public function show(Account $account, Product $product): ProductResource
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        abort_if($product->account_id !== $account->id, 404);

        return new ProductResource($product);
    }
}
