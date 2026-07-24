<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncLog extends Model
{
    use HasFactory;

    public const TYPE_PRODUCTS = 'products';

    public const TYPE_ORDERS = 'orders';

    public const TYPE_PAYMENTS = 'payments';

    public const TYPE_MESSAGES = 'messages';

    public const TYPE_REFRESH_TOKEN = 'refresh_token';

    public const TYPE_CLEANUP = 'cleanup';

    public const STATUS_SUCCESS = 'success';

    public const STATUS_FAILED = 'failed';

    protected $fillable = [
        'account_id',
        'type',
        'status',
        'message',
        'items_synced',
    ];

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
