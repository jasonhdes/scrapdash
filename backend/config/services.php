<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
    ],

    'mercadolivre' => [
        'client_id' => env('MERCADOLIVRE_CLIENT_ID'),
        'client_secret' => env('MERCADOLIVRE_CLIENT_SECRET'),
        'redirect_uri' => env('MERCADOLIVRE_REDIRECT_URI', 'https://scrapdash.local/auth/mercadolivre/callback'),
        'auth_url' => env('MERCADOLIVRE_AUTH_URL', 'https://auth.mercadolivre.com.br/authorization'),
        'api_url' => env('MERCADOLIVRE_API_URL', 'https://api.mercadolibre.com'),
        // A liberação do pagamento (`money_release_status`) só vem certa na API
        // do Mercado Pago — o endpoint /collections do Mercado Livre existe mas
        // fica desatualizado e não bate com o que aparece no site pro vendedor.
        'payments_api_url' => env('MERCADOLIVRE_PAYMENTS_API_URL', 'https://api.mercadopago.com'),
        // Para onde o navegador volta no frontend depois do callback — usado
        // como fallback quando a origem de quem iniciou a conexão não é uma
        // das permitidas abaixo (ver MercadoLivreAuthController::connect/callback).
        'frontend_redirect_url' => env('MERCADOLIVRE_FRONTEND_REDIRECT_URL', 'http://localhost:3000/dashboard'),
        // Origens de onde o frontend pode iniciar o OAuth — o callback só
        // redireciona de volta pra origem real de quem clicou "Conectar" se
        // ela estiver nessa lista (evita open redirect via header Origin
        // forjado). Sem barra no final, separado por vírgula.
        'frontend_allowed_origins' => array_filter(explode(',', env(
            'MERCADOLIVRE_FRONTEND_ALLOWED_ORIGINS',
            'http://localhost:3000,https://scrapdash.local',
        ))),
    ],

];
