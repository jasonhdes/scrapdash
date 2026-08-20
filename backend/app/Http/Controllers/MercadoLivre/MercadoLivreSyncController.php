<?php

namespace App\Http\Controllers\MercadoLivre;

use App\Http\Controllers\Controller;
use App\Jobs\SyncMessagesJob;
use App\Jobs\SyncOrderAddressesJob;
use App\Jobs\SyncOrdersJob;
use App\Jobs\SyncPaymentReleaseDatesJob;
use App\Jobs\SyncProductsJob;
use App\Models\Account;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

class MercadoLivreSyncController extends Controller
{
    private const THROTTLE_SECONDS = 20;

    /**
     * Disparo manual dos jobs de sincronização, chamado pelo front sempre
     * que o usuário entra na conta, troca de página ou aplica um filtro —
     * mantém os dados "em tempo real" em vez de esperar o agendamento
     * periódico. `Cache::add` age como trava: só dispara de fato se não
     * houver outro disparo nos últimos 20s pra essa conta, pra não estourar
     * a API do Mercado Livre com cliques/filtros em sequência.
     */
    public function trigger(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $triggered = Cache::add(
            "mercadolivre-sync-throttle:{$account->id}",
            true,
            now()->addSeconds(self::THROTTLE_SECONDS),
        );

        if ($triggered) {
            SyncProductsJob::dispatch($account);
            SyncOrdersJob::dispatch($account);
            SyncMessagesJob::dispatch($account);
            SyncPaymentReleaseDatesJob::dispatch($account);
            SyncOrderAddressesJob::dispatch($account);
        }

        return response()->json(['triggered' => $triggered]);
    }
}
