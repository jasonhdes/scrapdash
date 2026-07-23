<?php

namespace App\Http\Controllers\MercadoLivre;

use App\Http\Controllers\Controller;
use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class MercadoLivreAuthController extends Controller
{
    private const CACHE_PREFIX = 'ml_oauth:';

    public function __construct(private readonly MercadoLivreService $mercadoLivre) {}

    public function connect(Account $account): JsonResponse
    {
        $user = Auth::guard('api')->user();

        Gate::forUser($user)->authorize('update', $account);

        $state = Str::random(40);
        $pkce = $this->mercadoLivre->generatePkcePair();

        Cache::put(self::CACHE_PREFIX.$state, [
            'account_id' => $account->id,
            'code_verifier' => $pkce['verifier'],
        ], now()->addMinutes(10));

        return response()->json([
            'redirect_url' => $this->mercadoLivre->buildAuthorizationUrl($state, $pkce['challenge']),
        ]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $frontendUrl = config('services.mercadolivre.frontend_redirect_url');
        $state = (string) $request->query('state');
        $code = $request->query('code');

        $payload = Cache::pull(self::CACHE_PREFIX.$state);

        if (! $payload || ! $code) {
            return redirect()->away("{$frontendUrl}?ml_connected=0&reason=state_invalido");
        }

        $account = Account::find($payload['account_id']);

        if (! $account) {
            return redirect()->away("{$frontendUrl}?ml_connected=0&reason=conta_nao_encontrada");
        }

        try {
            $token = $this->mercadoLivre->exchangeCodeForToken($code, $payload['code_verifier']);
        } catch (\Throwable) {
            return redirect()->away("{$frontendUrl}?ml_connected=0&reason=falha_troca_token");
        }

        $account->update([
            'mercadolivre_user_id' => $token['user_id'] ?? null,
            'mercadolivre_access_token' => $token['access_token'],
            'mercadolivre_refresh_token' => $token['refresh_token'],
            'mercadolivre_token_expires_at' => now()->addSeconds($token['expires_in']),
        ]);

        return redirect()->away("{$frontendUrl}?ml_connected=1&account_id={$account->id}");
    }
}
