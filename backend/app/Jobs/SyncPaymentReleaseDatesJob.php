<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Payment;
use App\Models\SyncLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

class SyncPaymentReleaseDatesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    /**
     * Só existe um pagamento por chamada na API do Mercado Livre (não tem
     * busca em lote), então processamos aos poucos a cada execução em vez de
     * tentar todos de uma vez — evita um job que demora minutos e sobrecarga
     * a API deles.
     */
    private const BATCH_SIZE = 100;

    public function __construct(private readonly Account $account) {}

    public function handle(MercadoLivreService $mercadoLivre): void
    {
        $this->runLogged($this->account, SyncLog::TYPE_PAYMENT_RELEASES, function () use ($mercadoLivre) {
            // Prioridade 1: pagamentos nunca verificados (backfill) — sempre
            // preenche o lote com esses primeiro, senão pagamentos "vencidos
            // mas ainda não liberados" (comum nesta conta/ambiente, nem
            // sempre vira released=true na data prevista) competem pelo
            // mesmo espaço do lote e o backfill nunca termina de avançar.
            $neverChecked = Payment::whereHas('order', fn ($q) => $q->where('account_id', $this->account->id))
                ->where('status', 'approved')
                ->whereNull('money_release_date')
                ->orderBy('id')
                ->limit(self::BATCH_SIZE)
                ->get();

            $remainingSlots = self::BATCH_SIZE - $neverChecked->count();

            $overdueRecheck = $remainingSlots > 0
                ? Payment::whereHas('order', fn ($q) => $q->where('account_id', $this->account->id))
                    ->where('status', 'approved')
                    ->where('released', false)
                    ->where('money_release_date', '<=', now())
                    ->orderBy('money_release_date')
                    ->limit($remainingSlots)
                    ->get()
                : collect();

            $payments = $neverChecked->concat($overdueRecheck);

            $synced = 0;

            foreach ($payments as $payment) {
                try {
                    $release = $mercadoLivre->getPaymentRelease($this->account, $payment->mercadolivre_payment_id);
                } catch (Throwable $e) {
                    // Um pagamento com erro não deve travar o lote inteiro.
                    Log::warning("SyncPaymentReleaseDatesJob: falha no pagamento {$payment->mercadolivre_payment_id}: {$e->getMessage()}");

                    continue;
                }

                $payment->update([
                    'money_release_date' => $release['money_release_date'],
                    'released' => $release['released'] === 'yes',
                ]);
                $synced++;
            }

            return $synced;
        });
    }
}
