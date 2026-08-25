<?php

namespace App\Http\Controllers\MercadoLivre;

use App\Http\Controllers\Controller;
use App\Jobs\ImportOrderHistoryJob;
use App\Jobs\SyncMessagesJob;
use App\Jobs\SyncOrderAddressesJob;
use App\Jobs\SyncOrdersJob;
use App\Jobs\SyncPaymentReleaseDatesJob;
use App\Jobs\SyncProductsJob;
use App\Models\Account;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;

class MercadoLivreSyncController extends Controller
{
    private const THROTTLE_SECONDS = 20;

    private const HISTORY_THROTTLE_SECONDS = 300;

    private const HISTORY_MONTHS = 12;

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

    /**
     * Importação sob demanda do histórico de pedidos de até 1 ano atrás —
     * mesmo limite que o Mercado Livre permite filtrar. Dispara um job por
     * mês (ver ImportOrderHistoryJob) em vez de um só job cobrindo o ano
     * inteiro, pra cada busca ficar bem abaixo do limite de paginação da
     * API (offset + limit ≤ 1000) mesmo em contas de alto volume. Ação mais
     * pesada que a sincronização de rotina, por isso um trava bem mais
     * longa (5 min) — não faz sentido repetir isso a cada clique.
     */
    public function importHistory(Account $account): JsonResponse
    {
        Gate::forUser(Auth::guard('api')->user())->authorize('view', $account);

        $triggered = Cache::add(
            "mercadolivre-history-import-throttle:{$account->id}",
            true,
            now()->addSeconds(self::HISTORY_THROTTLE_SECONDS),
        );

        if ($triggered) {
            $now = CarbonImmutable::now();

            for ($i = 0; $i < self::HISTORY_MONTHS; $i++) {
                $chunkTo = $now->subMonthsNoOverflow($i);
                $chunkFrom = $now->subMonthsNoOverflow($i + 1);

                ImportOrderHistoryJob::dispatch($account, $chunkFrom, $chunkTo);
            }
        }

        return response()->json(['triggered' => $triggered]);
    }
}
