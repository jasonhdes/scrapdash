<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Collection;
use Tymon\JWTAuth\Contracts\JWTSubject;

class User extends Authenticatable implements JWTSubject
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'google_id',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Contas que esse usuário possui (role master/user).
     *
     * @return HasMany<Account, $this>
     */
    public function accounts(): HasMany
    {
        return $this->hasMany(Account::class);
    }

    /**
     * Contas às quais esse usuário foi concedido acesso como User Partner
     * (funcionário) — não são contas dele, são contas de outro User.
     *
     * @return BelongsToMany<Account, $this>
     */
    public function assignedAccounts(): BelongsToMany
    {
        return $this->belongsToMany(Account::class)->using(AccountUser::class)->withPivot('permissions')->withTimestamps();
    }

    /**
     * Todas as contas que esse usuário pode acessar de alguma forma:
     * master vê tudo, user vê as que possui, user_partner vê as atribuídas.
     *
     * @return Collection<int, Account>
     */
    public function accessibleAccounts(): Collection
    {
        return match ($this->role) {
            'master' => Account::all(),
            'user' => $this->accounts,
            'user_partner' => $this->assignedAccounts,
            default => collect(),
        };
    }

    /**
     * Se esse usuário pode fazer `$action` ("view" ou "manage") no módulo
     * `$module` ("products", "orders", "financial", "messages") dessa conta.
     * Master tem acesso total; dono da conta tem acesso total à própria
     * conta; user_partner depende das permissões atribuídas em `account_user`.
     */
    public function canAccessAccountModule(Account $account, string $module, string $action = 'view'): bool
    {
        if ($this->role === 'master') {
            return true;
        }

        if ($account->user_id === $this->id) {
            return true;
        }

        if ($this->role !== 'user_partner') {
            return false;
        }

        $pivot = $account->employees()->where('user_id', $this->id)->first()?->pivot;

        if (! $pivot) {
            return false;
        }

        $permissions = $pivot->permissions ?? [];
        $modulePermissions = is_array($permissions[$module] ?? null) ? $permissions[$module] : [];

        return in_array($action, $modulePermissions, true);
    }

    public function getJWTIdentifier(): mixed
    {
        return $this->getKey();
    }

    /**
     * @return array<string, mixed>
     */
    public function getJWTCustomClaims(): array
    {
        return ['role' => $this->role];
    }
}
