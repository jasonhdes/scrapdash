<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_with_correct_credentials_returns_token(): void
    {
        User::factory()->create([
            'email' => 'jason.teste@example.com',
            'password' => Hash::make('senha12345'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jason.teste@example.com',
            'password' => 'senha12345',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('user.email', 'jason.teste@example.com')
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in']);
    }

    public function test_login_with_wrong_password_is_rejected(): void
    {
        User::factory()->create([
            'email' => 'jason.teste@example.com',
            'password' => Hash::make('senha12345'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'jason.teste@example.com',
            'password' => 'senhaerrada',
        ]);

        $response->assertStatus(401);
        $this->assertArrayNotHasKey('access_token', $response->json());
    }

    public function test_login_with_unknown_email_is_rejected(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nao-existe@example.com',
            'password' => 'qualquercoisa',
        ]);

        $response->assertStatus(401);
    }

    public function test_login_is_rate_limited_after_repeated_attempts(): void
    {
        for ($i = 0; $i < 10; $i++) {
            $this->postJson('/api/auth/login', [
                'email' => 'nao-existe@example.com',
                'password' => 'errada',
            ])->assertStatus(401);
        }

        $this->postJson('/api/auth/login', [
            'email' => 'nao-existe@example.com',
            'password' => 'errada',
        ])->assertStatus(429);
    }
}
