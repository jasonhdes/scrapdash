<?php

namespace Tests\Feature\Auth;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegisterTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_default_account(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jason Teste',
            'email' => 'jason.teste@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'senha12345',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('user.email', 'jason.teste@example.com')
            ->assertJsonPath('user.role', 'user')
            ->assertJsonStructure(['access_token', 'token_type', 'expires_in']);

        $user = User::where('email', 'jason.teste@example.com')->firstOrFail();
        $this->assertTrue(Account::where('user_id', $user->id)->exists());
    }

    public function test_register_rejects_duplicate_email(): void
    {
        User::factory()->create(['email' => 'jason.teste@example.com']);

        $response = $this->postJson('/api/auth/register', [
            'name' => 'Outro Jason',
            'email' => 'jason.teste@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'senha12345',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('email');
    }

    public function test_register_rejects_mismatched_password_confirmation(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jason Teste',
            'email' => 'jason.teste@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'outrasenha',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_register_never_allows_creating_a_master_or_partner_via_role_injection(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Jason Teste',
            'email' => 'jason.teste@example.com',
            'password' => 'senha12345',
            'password_confirmation' => 'senha12345',
            'role' => 'master',
        ]);

        $response->assertStatus(201)->assertJsonPath('user.role', 'user');
    }
}
