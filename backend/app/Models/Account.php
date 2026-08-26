<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'marketplace',
        'mercadolivre_user_id',
        'mercadolivre_access_token',
        'mercadolivre_refresh_token',
        'mercadolivre_token_expires_at',
        'financial_balance_seed',
        'financial_balance_seed_updated_at',
        'financial_last_validated_at',
    ];

    protected $hidden = [
        'mercadolivre_access_token',
        'mercadolivre_refresh_token',
    ];

    protected function casts(): array
    {
        return [
            'mercadolivre_access_token' => 'encrypted',
            'mercadolivre_refresh_token' => 'encrypted',
            'mercadolivre_token_expires_at' => 'datetime',
            'financial_balance_seed' => 'decimal:2',
            'financial_balance_seed_updated_at' => 'datetime',
            'financial_last_validated_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * User Partners (funcionários) com acesso concedido a essa conta —
     * o dono da conta (`user_id`) já tem acesso total e não passa por aqui.
     *
     * @return BelongsToMany<User, $this>
     */
    public function employees(): BelongsToMany
    {
        return $this->belongsToMany(User::class)->using(AccountUser::class)->withPivot('permissions')->withTimestamps();
    }

    /**
     * @return HasMany<Product, $this>
     */
    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * @return HasMany<SyncLog, $this>
     */
    public function syncLogs(): HasMany
    {
        return $this->hasMany(SyncLog::class);
    }

    public function isConnectedToMercadoLivre(): bool
    {
        return ! is_null($this->mercadolivre_access_token);
    }

    public function mercadoLivreTokenExpiresSoon(): bool
    {
        return $this->mercadolivre_token_expires_at !== null
            && $this->mercadolivre_token_expires_at->isBefore(now()->addMinutes(30));
    }
}
