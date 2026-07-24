<?php

namespace App\Http\Controllers;

use App\Http\Resources\AccountResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Auth;

class AccountController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $accounts = Auth::guard('api')->user()->accounts;

        return AccountResource::collection($accounts);
    }
}
