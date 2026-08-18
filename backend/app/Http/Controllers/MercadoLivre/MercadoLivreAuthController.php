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

    public function connect(Request $request, Account $account): JsonResponse
    {
        $user = Auth::guard('api')->user();

        Gate::forUser($user)->authorize('update', $account);

        $state = Str::random(40);
        $pkce = $this->mercadoLivre->generatePkcePair();

        Cache::put(self::CACHE_PREFIX.$state, [
            'account_id' => $account->id,
            'code_verifier' => $pkce['verifier'],
            // Guardado pra callback() saber pra qual origem redirecionar de
            // volta — sem isso, uma URL de retorno fixa pode não bater com a
            // origem real do navegador (ex.: 127.0.0.1 vs localhost, outra
            // porta) e o token do localStorage (isolado por origem) some,
            // parecendo um logout que não é.
            'frontend_origin' => $request->headers->get('origin'),
        ], now()->addMinutes(10));

        return response()->json([
            'redirect_url' => $this->mercadoLivre->buildAuthorizationUrl($state, $pkce['challenge']),
        ]);
    }

    public function callback(Request $request): RedirectResponse
    {
        $state = (string) $request->query('state');
        $code = $request->query('code');

        $payload = Cache::pull(self::CACHE_PREFIX.$state);
        $frontendUrl = $this->resolveFrontendUrl($payload['frontend_origin'] ?? null);

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

        if (empty($token['access_token'])) {
            return redirect()->away("{$frontendUrl}?ml_connected=0&reason=resposta_sem_access_token");
        }

        $account->update([
            'mercadolivre_user_id' => $token['user_id'] ?? null,
            'mercadolivre_access_token' => $token['access_token'],
            // Preserva o refresh_token anterior se a resposta não trouxer um novo —
            // sem esse fallback, uma reconexão cuja resposta venha sem refresh_token
            // apaga silenciosamente o que já estava salvo e a conta nunca mais é
            // renovada automaticamente (RefreshTokenJob exige refresh_token não nulo).
            'mercadolivre_refresh_token' => $token['refresh_token'] ?? $account->mercadolivre_refresh_token,
            // Mercado Livre nem sempre retorna expires_in; 21600s (6h) é o TTL padrão documentado.
            'mercadolivre_token_expires_at' => now()->addSeconds($token['expires_in'] ?? 21600),
        ]);

        return redirect()->away("{$frontendUrl}?ml_connected=1&account_id={$account->id}");
    }

    /**
     * Redireciona de volta pra origem real de quem iniciou a conexão, desde
     * que ela esteja na allowlist (evita open redirect via Origin forjado).
     * Sem origem reconhecida, cai na URL fixa configurada.
     */
    private function resolveFrontendUrl(?string $origin): string
    {
        $fallback = config('services.mercadolivre.frontend_redirect_url');

        if (! $origin) {
            return $fallback;
        }

        $origin = rtrim($origin, '/');
        $allowed = config('services.mercadolivre.frontend_allowed_origins', []);

        return in_array($origin, $allowed, true) ? "{$origin}/dashboard" : $fallback;
    }
}
