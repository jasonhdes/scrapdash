<?php

namespace App\Application\Services;

use App\Models\Account;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class AuditLogger
{
    /**
     * @param  array<string, mixed>  $meta
     */
    public static function log(User $user, string $action, ?Account $account = null, ?Model $subject = null, array $meta = []): void
    {
        AuditLog::create([
            'user_id' => $user->id,
            'account_id' => $account?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'meta' => $meta,
        ]);
    }
}
