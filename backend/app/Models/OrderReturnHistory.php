<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrderReturnHistory extends Model
{
    protected $fillable = [
        'account_id',
        'order_id',
        'status',
        'occurred_at',
        'buyer_name',
        'value',
        'product_name',
        'source',
    ];

    protected function casts(): array
    {
        return [
            'occurred_at' => 'datetime',
            'value' => 'decimal:2',
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
