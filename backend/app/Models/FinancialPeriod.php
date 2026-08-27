<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialPeriod extends Model
{
    protected $fillable = [
        'account_id',
        'previous_balance',
        'total_sales',
        'held_balance',
        'refunded_balance',
        'discounts',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'previous_balance' => 'decimal:2',
            'total_sales' => 'decimal:2',
            'held_balance' => 'decimal:2',
            'refunded_balance' => 'decimal:2',
            'discounts' => 'decimal:2',
            'closed_at' => 'datetime',
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
     * Soma de `purchases` dentro da janela deste período — "despesas" não
     * tem coluna própria aqui, é sempre derivada da lista de lançamentos já
     * existente, igual antes.
     */
    public function despesas(): float
    {
        return (float) Purchase::where('account_id', $this->account_id)
            ->where('occurred_at', '>=', $this->created_at)
            ->when($this->closed_at, fn ($q) => $q->where('occurred_at', '<=', $this->closed_at))
            ->sum('value');
    }

    public function endingBalance(): float
    {
        return (float) $this->previous_balance
            + (float) $this->total_sales
            - (float) $this->held_balance
            - (float) $this->refunded_balance
            - (float) $this->discounts
            - $this->despesas();
    }
}
