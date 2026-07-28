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
        'shipping_id',
        'status',
        'total_amount',
        'currency',
        'buyer_nickname',
        'buyer_city',
        'buyer_state',
        'buyer_address_synced_at',
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
            'buyer_address_synced_at' => 'datetime',
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
     * Importante: usa `id` como critério de "mais recente", não `paid_at`.
     * `latestOfMany` faz um join comparando o valor máximo do critério com a
     * própria coluna — com `paid_at`, um pagamento aprovado real mas com
     * `paid_at` nulo (existe na API do ML, ~3% dos casos) nunca dá match
     * nesse join e a relação inteira vira null, escondendo silenciosamente
     * uma data de liberação que existe de verdade. `id` nunca é nulo.
     *
     * @return HasOne<Payment, $this>
     */
    public function approvedPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->where('status', 'approved')->latestOfMany('id');
    }

    /**
     * @return HasMany<Message, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
