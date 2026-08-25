<?php

namespace App\Infrastructure\MercadoLivre;

use App\Models\Account;
use Carbon\CarbonInterface;
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
     * Simula a taxa de venda que o Mercado Livre cobraria hoje por esse
     * anúncio (preço + categoria + tipo de listagem), pra calcular quanto o
     * vendedor efetivamente recebe por venda. `site_id` é sempre o prefixo
     * alfabético do `category_id` (convenção do ML, ex.: "MLB123" -> "MLB").
     * Retorna null em vez de lançar exceção porque essa chamada roda uma vez
     * por anúncio durante a sincronização — uma falha isolada não deve
     * derrubar o sync inteiro dos outros produtos da conta.
     */
    public function getSaleFee(Account $account, float $price, string $listingTypeId, string $categoryId): ?float
    {
        if (! preg_match('/^[A-Z]+/', $categoryId, $match)) {
            return null;
        }

        $siteId = $match[0];

        $response = $this->authorizedRequest($account)->get(
            config('services.mercadolivre.api_url')."/sites/{$siteId}/listing_prices",
            ['price' => $price, 'listing_type_id' => $listingTypeId, 'category_id' => $categoryId],
        );

        if (! $response->successful()) {
            return null;
        }

        $fee = $response->json('sale_fee_amount');

        return is_numeric($fee) ? (float) $fee : null;
    }

    /**
     * Sem `$dateFrom`/`$dateTo`, traz só os pedidos mais recentes — o
     * `offset < 1000` abaixo é o próprio limite de paginação da API do
     * Mercado Livre (offset + limit não pode passar de 1000), então uma
     * conta com muito volume nunca alcança pedidos de meses atrás dessa
     * forma. Passando um período (ver ImportOrderHistoryJob), cada busca
     * fica restrita a esse intervalo, o que mantém a contagem de resultados
     * abaixo desse limite mesmo pra contas de alto volume.
     *
     * @return array<int, array<string, mixed>>
     */
    public function searchOrders(Account $account, ?CarbonInterface $dateFrom = null, ?CarbonInterface $dateTo = null): array
    {
        $orders = [];
        $offset = 0;
        $limit = 50;

        $baseQuery = ['seller' => $account->mercadolivre_user_id, 'sort' => 'date_desc'];
        if ($dateFrom) {
            $baseQuery['order.date_created.from'] = $dateFrom->toIso8601String();
        }
        if ($dateTo) {
            $baseQuery['order.date_created.to'] = $dateTo->toIso8601String();
        }

        do {
            $response = $this->authorizedRequest($account)->get(
                config('services.mercadolivre.api_url').'/orders/search',
                [...$baseQuery, 'offset' => $offset, 'limit' => $limit],
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
     * Envia uma resposta numa conversa existente. `$counterpartId` é o
     * usuário do outro lado da conversa (quem não somos nós) — vem de uma
     * mensagem já sincronizada dessa conversa, não tem como descobrir do
     * zero sem isso.
     */
    public function sendMessage(Account $account, string $packId, string $counterpartId, string $text): void
    {
        $response = $this->authorizedRequest($account)->post(
            config('services.mercadolivre.api_url')."/messages/packs/{$packId}/sellers/{$account->mercadolivre_user_id}?tag=post_sale",
            [
                'from' => ['user_id' => (string) $account->mercadolivre_user_id],
                'to' => ['user_id' => $counterpartId],
                'text' => $text,
            ],
        );

        $this->assertSuccessful($response, 'Falha ao enviar a mensagem no Mercado Livre');
    }

    /**
     * A data de liberação do dinheiro (`money_release_date`) e o detalhamento
     * de taxas só vêm no recurso completo do pagamento, não no resumo
     * embutido no pedido — é preciso uma chamada por pagamento.
     *
     * @return array{
     *     money_release_date: ?string,
     *     released: string,
     *     ml_fee: ?float,
     *     mp_processing_fee: ?float,
     *     shipping_fee: ?float,
     *     financing_fee: ?float,
     *     coupon_amount: ?float,
     *     net_received_amount: ?float,
     * }
     */
    public function getPaymentRelease(Account $account, string $paymentId): array
    {
        // Usa a API do Mercado Pago (não a de /collections do Mercado Livre):
        // essa é a fonte que reflete o status de liberação real, igual ao que
        // aparece pro vendedor no site. Ver nota em config/services.php.
        $response = $this->authorizedRequest($account)->get(
            config('services.mercadolivre.payments_api_url')."/v1/payments/{$paymentId}",
        );

        $empty = [
            'money_release_date' => null,
            'released' => 'no',
            'ml_fee' => null,
            'mp_processing_fee' => null,
            'shipping_fee' => null,
            'financing_fee' => null,
            'coupon_amount' => null,
            'net_received_amount' => null,
            'shipping_charged_on_cancel' => false,
        ];

        if ($response->status() === 404) {
            return $empty;
        }

        $this->assertSuccessful($response, 'Falha ao buscar a liberação do pagamento no Mercado Pago');

        // `charges_details` traz as taxas descontadas do vendedor uma a uma —
        // agrupadas pelas categorias que aparecem de verdade nos dados desta
        // conta. Envio pode vir com nomes diferentes (shp_cross_docking,
        // shp_fulfillment, etc.) dependendo do tipo de logística do anúncio,
        // por isso o prefixo em vez do nome exato.
        $fees = ['ml_fee' => null, 'mp_processing_fee' => null, 'shipping_fee' => null, 'financing_fee' => null, 'coupon_amount' => null];

        // Nem toda cobrança de frete registrada na venda vira uma cobrança
        // de fato no cancelamento — o valor só sai do bolso do vendedor
        // quando `refund_charges` vem preenchido (o ML efetivamente
        // executou uma cobrança de frete contra o vendedor durante o
        // estorno). Vazio significa que foi só o registro padrão da taxa no
        // momento da venda, sem nenhuma cobrança extra no cancelamento.
        $shippingChargedOnCancel = false;

        foreach ($response->json('charges_details') ?? [] as $charge) {
            $name = $charge['name'] ?? '';
            $amount = $charge['amounts']['original'] ?? null;

            if ($name === 'ml_sale_fee') {
                $fees['ml_fee'] = $amount;
            } elseif ($name === 'mp_processing_fee') {
                $fees['mp_processing_fee'] = $amount;
            } elseif ($name === 'mp_financing_fee') {
                $fees['financing_fee'] = $amount;
            } elseif (($charge['type'] ?? null) === 'coupon') {
                $fees['coupon_amount'] = $amount;
            } elseif (str_starts_with($name, 'shp_')) {
                $fees['shipping_fee'] = ($fees['shipping_fee'] ?? 0) + $amount;

                if (! empty($charge['refund_charges'])) {
                    $shippingChargedOnCancel = true;
                }
            }
        }

        return [
            'money_release_date' => $response->json('money_release_date'),
            'released' => $response->json('money_release_status') === 'released' ? 'yes' : 'no',
            ...$fees,
            'net_received_amount' => $response->json('transaction_details.net_received_amount'),
            'shipping_charged_on_cancel' => $shippingChargedOnCancel,
        ];
    }

    /**
     * @return array{city: ?string, state: ?string, status: ?string, substatus: ?string}
     */
    public function getShipmentAddress(Account $account, string $shippingId): array
    {
        $response = $this->authorizedRequest($account)->get(
            config('services.mercadolivre.api_url')."/shipments/{$shippingId}",
        );

        if ($response->status() === 404) {
            return ['city' => null, 'state' => null, 'status' => null, 'substatus' => null];
        }

        $this->assertSuccessful($response, 'Falha ao buscar o endereço de entrega no Mercado Livre');

        return [
            'city' => $response->json('receiver_address.city.name'),
            'state' => $response->json('receiver_address.state.name'),
            'status' => $response->json('status'),
            'substatus' => $response->json('substatus'),
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
