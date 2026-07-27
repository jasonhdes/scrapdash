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
        'synced_at',
    ];

    protected function casts(): array
    {
        return [
            'transaction_amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'money_release_date' => 'datetime',
            'released' => 'boolean',
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
