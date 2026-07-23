<?php

namespace App\Infrastructure\MercadoLivre;

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
        $response = Http::asForm()->post(config('services.mercadolivre.api_url').'/oauth/token', [
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
        $response = Http::asForm()->post(config('services.mercadolivre.api_url').'/oauth/token', [
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
}
