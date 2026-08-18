<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'mercadolivre_payment_id',
        'status',
        'transaction_amount',
        'payment_method',
        'paid_at',
        'money_release_date',
        'released',
        'ml_fee',
        'mp_processing_fee',
        'shipping_fee',
        'financing_fee',
        'coupon_amount',
        'net_received_amount',
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'transaction_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'money_release_date' => 'datetime',
            'released' => 'boolean',
            'ml_fee' => 'decimal:2',
            'mp_processing_fee' => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'financing_fee' => 'decimal:2',
            'coupon_amount' => 'decimal:2',
            'net_received_amount' => 'decimal:2',
            'synced_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
