<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Auth\Concerns\IssuesJwtTokens;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\GoogleLoginRequest;
use App\Infrastructure\Google\GoogleAuthService;
use App\Models\Account;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use RuntimeException;

class GoogleAuthController extends Controller
{
    use IssuesJwtTokens;

    public function __construct(private readonly GoogleAuthService $google) {}

    public function login(GoogleLoginRequest $request): JsonResponse
    {
        try {
            $payload = $this->google->verifyIdToken($request->validated('credential'));
        } catch (RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        }

        $user = User::where('google_id', $payload->sub)->first()
            ?? User::where('email', $payload->email)->first();

        if ($user) {
            if (! $user->google_id) {
                $user->update(['google_id' => $payload->sub]);
            }
        } else {
            $user = User::create([
                'name' => $payload->name ?? $payload->email,
                'email' => $payload->email,
                'google_id' => $payload->sub,
                'password' => Str::password(32),
                'role' => 'user',
            ]);

            Account::create([
                'user_id' => $user->id,
                'name' => 'Conta Principal',
                'marketplace' => 'mercado_livre',
            ]);
        }

        $token = Auth::guard('api')->login($user);

        return $this->tokenResponse($token, $user);
    }
}
