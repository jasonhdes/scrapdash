<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\SyncLog;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Busca os pedidos de um período específico (um bloco de até 1 mês) —
 * a sincronização de rotina (SyncOrdersJob) só alcança os ~1000 pedidos
 * mais recentes, limite de paginação da própria API do Mercado Livre
 * (offset + limit não pode passar de 1000), então uma conta com muito
 * volume nunca chega a sincronizar pedidos de meses atrás dessa forma.
 * Disparado em blocos mensais por MercadoLivreSyncController::importHistory
 * pra cobrir até 1 ano pra trás sem estourar esse limite em nenhum bloco.
 */
class ImportOrderHistoryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    public function __construct(
        private readonly Account $account,
        private readonly CarbonImmutable $from,
        private readonly CarbonImmutable $to,
    ) {}

    public function handle(MercadoLivreService $mercadoLivre): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_ORDER_HISTORY_IMPORT, function () use ($mercadoLivre) {
            $orders = $mercadoLivre->searchOrders($this->account, $this->from, $this->to);

            return (new SyncOrdersJob($this->account))->applyOrders($orders);
        });
    }
}
