<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'mercadolivre_order_id',
        'pack_id',
        'status',
        'total_amount',
        'currency',
        'buyer_nickname',
        'ordered_at',
        'processed_at',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'total_amount' => 'decimal:2',
            'ordered_at' => 'datetime',
            'processed_at' => 'datetime',
            'synced_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Usado na listagem de pedidos pra trazer a data de liberação do dinheiro
     * sem precisar carregar todos os pagamentos do pedido.
     *
     * @return HasOne<Payment, $this>
     */
    public function approvedPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->where('status', 'approved')->latestOfMany('paid_at');
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }
}
