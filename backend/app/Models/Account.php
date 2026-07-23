<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
     * @return HasMany<Employee, $this>
     */
    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function isConnectedToMercadoLivre(): bool
    {
        return ! is_null($this->mercadolivre_access_token);
    }
}
