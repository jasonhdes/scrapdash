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
            // Três prioridades disputando o mesmo lote, nessa ordem, pra
            // nenhuma travar as outras:
            // 1. Nunca verificados (backfill) — não têm nada ainda.
            // 2. Já têm data de liberação mas não têm as taxas (pagamentos
            //    sincronizados antes do detalhamento de taxas existir,
            //    incluindo os já liberados — esses nunca entrariam na
            //    prioridade 3, que só pega released=false). Usa
            //    `net_received_amount` (não `ml_fee`) como sinal de "já
            //    processado": alguns métodos de pagamento (ex.: crédito
            //    consumer_credits) legitimamente não têm charges_details
            //    detalhado, então `ml_fee` continuaria nulo pra sempre e o
            //    pagamento voltaria a disputar o lote em todo run.
            // 3. "Vencidos mas ainda não liberados" (comum nesta conta, nem
            //    sempre vira released=true na data prevista) — só recheca
            //    liberação, as taxas desses já foram capturadas antes.
            $baseQuery = fn () => Payment::whereHas('order', fn ($q) => $q->where('account_id', $this->account->id))
                ->where('status', 'approved');

            $neverChecked = $baseQuery()
                ->whereNull('money_release_date')
                ->orderBy('id')
                ->limit(self::BATCH_SIZE)
                ->get();

            $remainingSlots = self::BATCH_SIZE - $neverChecked->count();

            $missingFees = $remainingSlots > 0
                ? $baseQuery()
                    ->whereNotNull('money_release_date')
                    ->whereNull('net_received_amount')
                    ->orderBy('id')
                    ->limit($remainingSlots)
                    ->get()
                : collect();

            $remainingSlots -= $missingFees->count();

            $overdueRecheck = $remainingSlots > 0
                ? $baseQuery()
                    ->where('released', false)
                    ->where('money_release_date', '<=', now())
                    ->orderBy('money_release_date')
                    ->limit($remainingSlots)
                    ->get()
                : collect();

            $payments = $neverChecked->concat($missingFees)->concat($overdueRecheck);

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
                    'ml_fee' => $release['ml_fee'],
                    'mp_processing_fee' => $release['mp_processing_fee'],
                    'shipping_fee' => $release['shipping_fee'],
                    'financing_fee' => $release['financing_fee'],
                    'coupon_amount' => $release['coupon_amount'],
                    'net_received_amount' => $release['net_received_amount'],
                ]);
                $synced++;
            }

            return $synced;
        });
    }
}
