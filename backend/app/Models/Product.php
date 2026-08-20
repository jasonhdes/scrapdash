<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_id',
        'mercadolivre_item_id',
        'title',
        'seller_sku',
        'price',
        'sale_fee_amount',
        'currency',
        'available_quantity',
        'status',
        'logistic_type',
        'permalink',
        'thumbnail',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'sale_fee_amount' => 'decimal:2',
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
     * Itens de pedido do mesmo anúncio — ligação por `mercadolivre_item_id`
     * (não por FK numérica) porque produto e item de pedido nunca são
     * criados juntos, só coincidem no id do anúncio na origem (ML).
     *
     * @return HasMany<OrderItem, $this>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'mercadolivre_item_id', 'mercadolivre_item_id');
    }
}
