<?php

namespace App\Infrastructure\MercadoLivre;

use App\Models\Account;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class MercadoLivreService
{
    /**
     * @return array{verifier: string, challenge: string}
     */
    public function generatePkcePair(): array
    {
        $verifier = Str::random(64);
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');

        return ['verifier' => $verifier, 'challenge' => $challenge];
    }

    public function buildAuthorizationUrl(string $state, string $codeChallenge): string
    {
        $query = http_build_query([
            'response_type' => 'code',
            'client_id' => config('services.mercadolivre.client_id'),
            'redirect_uri' => config('services.mercadolivre.redirect_uri'),
            'state' => $state,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ]);

        return config('services.mercadolivre.auth_url').'?'.$query;
    }

    /**
     * @return array{access_token: string, refresh_token: string, expires_in: int, user_id: int}
     */
    public function exchangeCodeForToken(string $code, string $codeVerifier): array
    {
        $response = Http::asForm()->timeout(30)->post(config('services.mercadolivre.api_url').'/oauth/token', [
            'grant_type' => 'authorization_code',
            'client_id' => config('services.mercadolivre.client_id'),
            'client_secret' => config('services.mercadolivre.client_secret'),
            'code' => $code,
            'redirect_uri' => config('services.mercadolivre.redirect_uri'),
            'code_verifier' => $codeVerifier,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Falha ao trocar o code por token no Mercado Livre: '.$response->body());
        }

        return $response->json();
    }

    /**
     * @return array{access_token: string, refresh_token: string, expires_in: int, user_id: int}
     */
    public function refreshAccessToken(string $refreshToken): array
    {
        $response = Http::asForm()->timeout(30)->post(config('services.mercadolivre.api_url').'/oauth/token', [
            'grant_type' => 'refresh_token',
            'client_id' => config('services.mercadolivre.client_id'),
            'client_secret' => config('services.mercadolivre.client_secret'),
            'refresh_token' => $refreshToken,
        ]);

        if ($response->failed()) {
            throw new RuntimeException('Falha ao renovar o token do Mercado Livre: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Renova o token da account e persiste o resultado, se ainda houver refresh_token.
     */
    public function refreshAccountToken(Account $account): void
    {
        if (! $account->mercadolivre_refresh_token) {
            throw new RuntimeException("Account #{$account->id} não tem refresh_token — é preciso reconectar.");
        }

        $token = $this->refreshAccessToken($account->mercadolivre_refresh_token);

        $account->update([
            'mercadolivre_access_token' => $token['access_token'],
            'mercadolivre_refresh_token' => $token['refresh_token'] ?? $account->mercadolivre_refresh_token,
            'mercadolivre_token_expires_at' => now()->addSeconds($token['expires_in'] ?? 21600),
        ]);
    }

    /**
     * @return array<int, string> IDs dos itens (paginado, limitado a 1000 resultados por busca padrão da API).
     */
    public function searchItemIds(Account $account): array
    {
        $ids = [];
        $offset = 0;
        $limit = 50;

        do {
            $response = $this->authorizedRequest($account)->get(
                config('services.mercadolivre.api_url')."/users/{$account->mercadolivre_user_id}/items/search",
                ['offset' => $offset, 'limit' => $limit],
            );

            $this->assertSuccessful($response, 'Falha ao buscar itens do Mercado Livre');

            $page = $response->json('results') ?? [];
            $ids = array_merge($ids, $page);
            $offset += $limit;
            $total = $response->json('paging.total') ?? 0;
        } while (count($ids) < $total && count($page) > 0 && $offset < 1000);

        return $ids;
    }

    /**
     * @param  array<int, string>  $itemIds
     * @return array<int, array<string, mixed>>
     */
    public function getItemsDetails(Account $account, array $itemIds): array
    {
        $items = [];

        foreach (array_chunk($itemIds, 20) as $chunk) {
            $response = $this->authorizedRequest($account)->get(
                config('services.mercadolivre.api_url').'/items',
                ['ids' => implode(',', $chunk)],
            );

            $this->assertSuccessful($response, 'Falha ao buscar detalhes dos itens do Mercado Livre');

            foreach ($response->json() ?? [] as $entry) {
                if (($entry['code'] ?? null) === 200) {
                    $items[] = $entry['body'];
                }
            }
        }

        return $items;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function searchOrders(Account $account): array
    {
        $orders = [];
        $offset = 0;
        $limit = 50;

        do {
            $response = $this->authorizedRequest($account)->get(
                config('services.mercadolivre.api_url').'/orders/search',
                ['seller' => $account->mercadolivre_user_id, 'offset' => $offset, 'limit' => $limit, 'sort' => 'date_desc'],
            );

            $this->assertSuccessful($response, 'Falha ao buscar pedidos do Mercado Livre');

            $page = $response->json('results') ?? [];
            $orders = array_merge($orders, $page);
            $offset += $limit;
            $total = $response->json('paging.total') ?? 0;
        } while (count($orders) < $total && count($page) > 0 && $offset < 1000);

        return $orders;
    }

    /**
     * As mensagens de um pedido no Mercado Livre ficam agrupadas em um "pack".
     * Para pedidos avulsos, o pack id é o próprio id do pedido; para pedidos que
     * fazem parte de uma compra com múltiplos itens, é preciso usar o `pack_id`
     * do pedido — usar o id do pedido nesse caso retorna 400 "order_belong_pack".
     *
     * @return array<int, array<string, mixed>>
     */
    public function getOrderMessages(Account $account, string $packId): array
    {
        $response = $this->authorizedRequest($account)->get(
            config('services.mercadolivre.api_url')."/messages/packs/{$packId}/sellers/{$account->mercadolivre_user_id}",
            ['tag' => 'post_sale'],
        );

        if ($response->status() === 404) {
            return [];
        }

        $this->assertSuccessful($response, 'Falha ao buscar mensagens do pedido no Mercado Livre');

        return $response->json('messages') ?? [];
    }

    /**
     * A data de liberação do dinheiro (`money_release_date`) só vem no recurso
     * completo do pagamento, não no resumo embutido no pedido — é preciso uma
     * chamada por pagamento (endpoint legado `/collections/{id}`; o endpoint
     * novo `/v1/payments/{id}` retornou 404 para os pagamentos testados).
     *
     * @return array{money_release_date: ?string, released: string}
     */
    public function getPaymentRelease(Account $account, string $paymentId): array
    {
        $response = $this->authorizedRequest($account)->get(
            config('services.mercadolivre.api_url')."/collections/{$paymentId}",
        );

        if ($response->status() === 404) {
            return ['money_release_date' => null, 'released' => 'no'];
        }

        $this->assertSuccessful($response, 'Falha ao buscar a liberação do pagamento no Mercado Livre');

        return [
            'money_release_date' => $response->json('money_release_date'),
            'released' => $response->json('released', 'no'),
        ];
    }

    private function authorizedRequest(Account $account): PendingRequest
    {
        return Http::withToken($account->mercadolivre_access_token)->timeout(30);
    }

    private function assertSuccessful(Response $response, string $message): void
    {
        if ($response->failed()) {
            throw new RuntimeException("{$message}: {$response->body()}");
        }
    }
}
