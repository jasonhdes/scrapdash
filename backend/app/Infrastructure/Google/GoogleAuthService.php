<?php

namespace App\Infrastructure\Google;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use stdClass;

class GoogleAuthService
{
    private const CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

    private const VALID_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

    /**
     * Verifica um Google ID token (JWT emitido pelo Google Identity Services)
     * e retorna o payload decodificado.
     */
    public function verifyIdToken(string $idToken): stdClass
    {
        $keySet = JWK::parseKeySet($this->fetchCerts());

        $payload = JWT::decode($idToken, $keySet);

        if (! in_array($payload->iss ?? null, self::VALID_ISSUERS, true)) {
            throw new RuntimeException('Emissor do token do Google inválido.');
        }

        if (($payload->aud ?? null) !== config('services.google.client_id')) {
            throw new RuntimeException('Audience do token do Google não corresponde a este aplicativo.');
        }

        if (empty($payload->email_verified)) {
            throw new RuntimeException('E-mail do Google não verificado.');
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchCerts(): array
    {
        return Cache::remember('google_oauth_certs', now()->addHour(), function () {
            $response = Http::get(self::CERTS_URL);

            if ($response->failed()) {
                throw new RuntimeException('Falha ao buscar as chaves públicas do Google.');
            }

            return $response->json();
        });
    }
}
