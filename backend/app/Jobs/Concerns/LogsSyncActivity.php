<?php

namespace App\Jobs\Concerns;

use App\Models\Account;
use App\Models\SyncLog;
use Throwable;

trait LogsSyncActivity
{
    /**
     * Executa $callback, registrando o resultado em sync_logs.
     * Relança a exceção em caso de falha, para o mecanismo de retry da fila continuar valendo.
     */
    private function runLogged(Account $account, string $type, callable $callback): void
    {
        try {
            $itemsSynced = $callback();

            SyncLog::create([
                'account_id' => $account->id,
                'type' => $type,
                'status' => SyncLog::STATUS_SUCCESS,
                'items_synced' => is_int($itemsSynced) ? $itemsSynced : 0,
            ]);
        } catch (Throwable $e) {
            SyncLog::create([
                'account_id' => $account->id,
                'type' => $type,
                'status' => SyncLog::STATUS_FAILED,
                'message' => $e->getMessage(),
            ]);

            throw $e;
        }
    }
}
