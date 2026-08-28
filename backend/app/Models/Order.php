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
        'shipping_status',
        'shipping_substatus',
        'shipping_status_synced_at',
        'status',
        'logistic_type',
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
            'shipping_status_synced_at' => 'datetime',
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
     * Usado na listagem de pedidos pra sinalizar "em mediação" sem carregar
     * todos os pagamentos — mesmo motivo/critério de `approvedPayment` acima.
     *
     * @return HasOne<Payment, $this>
     */
    public function mediationPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->where('status', 'in_mediation')->latestOfMany('id');
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

    /**
     * @return HasMany<OrderReturn, $this>
     */
    public function returns(): HasMany
    {
        return $this->hasMany(OrderReturn::class);
    }

    /**
     * Quanto o valor líquido exibido deste pedido precisa ser ajustado por
     * causa das atualizações de devolução/reembolso registradas NA MÃO
     * nele — mesmo sinal usado no cálculo do "Saldo atual" do período:
     * "Valor retido" e descontos SAEM (subtraem), "Cliente reembolsado"
     * (estorno_valor) VOLTA (soma, reduzindo o quanto se subtrai).
     * "Reembolso" (novo status) não entra aqui — combinado com o usuário
     * que fica só como registro, sem afetar nenhum saldo calculado.
     *
     * Só considera registros `source = 'manual'`: os automáticos
     * (gerados por OrderReturnController::sync()) sempre DERIVAM o valor
     * do `net_received_amount` do pagamento já sincronizado — são um
     * retrato descritivo de um fato que o valor líquido JÁ reflete, não um
     * delta independente. Somar eles aqui de novo contaria o mesmo valor
     * duas vezes pra todo pedido cancelado/em mediação já sincronizado.
     */
    public function returnsAdjustment(): float
    {
        $returns = ($this->relationLoaded('returns') ? $this->returns : $this->returns()->get())
            ->where('source', 'manual');

        $held = (float) $returns->where('status', OrderReturn::STATUS_VALOR_RETIDO)->sum('value');
        $refunded = (float) $returns->where('status', OrderReturn::STATUS_ESTORNO_VALOR)->sum('value');
        $discounts = (float) $returns->whereIn('status', [
            OrderReturn::STATUS_DESCONTO_VENDA,
            OrderReturn::STATUS_DESCONTO_FRETE,
        ])->sum('value');

        return $held - $refunded + $discounts;
    }

    /**
     * @return HasMany<OrderReturnHistory, $this>
     */
    public function returnHistory(): HasMany
    {
        return $this->hasMany(OrderReturnHistory::class);
    }
}
