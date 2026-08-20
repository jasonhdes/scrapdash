<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderReturn extends Model
{
    public const STATUS_PECAS_DEVOLVIDAS = 'pecas_devolvidas';

    public const STATUS_COMPROU_CANCELOU = 'comprou_cancelou';

    public const STATUS_VALOR_RETIDO = 'valor_retido';

    public const STATUS_ESTORNO_VALOR = 'estorno_valor';

    public const STATUS_DESCONTO_VENDA = 'desconto_venda';

    public const STATUS_DESCONTO_FRETE = 'desconto_frete';

    public const STATUS_VENDA_BALCAO = 'venda_balcao';

    /**
     * @var array<int, string>
     */
    public const STATUSES = [
        self::STATUS_PECAS_DEVOLVIDAS,
        self::STATUS_COMPROU_CANCELOU,
        self::STATUS_VALOR_RETIDO,
        self::STATUS_ESTORNO_VALOR,
        self::STATUS_DESCONTO_VENDA,
        self::STATUS_DESCONTO_FRETE,
        self::STATUS_VENDA_BALCAO,
    ];

    protected $fillable = [
        'account_id',
        'order_id',
        'status',
        'occurred_at',
        'buyer_name',
        'value',
        'product_name',
        'verified',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'value' => 'decimal:2',
            'verified' => 'boolean',
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
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
