<?php

namespace App\Jobs;

use App\Infrastructure\MercadoLivre\MercadoLivreService;
use App\Jobs\Concerns\LogsSyncActivity;
use App\Models\Account;
use App\Models\Order;
use App\Models\Payment;
use App\Models\SyncLog;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SyncPaymentsJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, LogsSyncActivity, Queueable, SerializesModels;

    public int $tries = 3;

    /** @var array<int, int> */
    public array $backoff = [60, 300, 900];

    /**
     * @param  array<int, array<string, mixed>>  $ordersData  Pedidos do Mercado Livre já buscados por
     *                                                        SyncOrdersJob — os pagamentos vêm embutidos
     *                                                        no próprio recurso de pedido da API deles,
     *                                                        não existe endpoint separado de "pagamentos
     *                                                        do vendedor".
     */
    public function __construct(private readonly Account $account, private readonly array $ordersData) {}

    public function handle(): void
    {
        // Não injetado via assinatura de handle() porque essa classe é
        // sempre instanciada e chamada em processo (`new
        // SyncPaymentsJob(...)->handle()`), nunca por ::dispatch() — o
        // container só resolveria os parâmetros automaticamente no segundo
        // caso.
        $mercadoLivre = app(MercadoLivreService::class);

        $this->runLogged($this->account, SyncLog::TYPE_PAYMENTS, function () use ($mercadoLivre) {
            $synced = 0;

            foreach ($this->ordersData as $orderData) {
                $order = Order::where('mercadolivre_order_id', (string) $orderData['id'])->first();

                if (! $order) {
                    continue;
                }

                foreach ($orderData['payments'] ?? [] as $paymentData) {
                    $existing = Payment::where('mercadolivre_payment_id', (string) $paymentData['id'])->first();
                    $newStatus = $paymentData['status'] ?? null;
                    $isNewPayment = ! $existing;

                    $attributes = [
                        'order_id' => $order->id,
                        'status' => $newStatus,
                        'transaction_amount' => $paymentData['transaction_amount'] ?? null,
                        'payment_method' => $paymentData['payment_method_id'] ?? null,
                        'paid_at' => isset($paymentData['date_approved']) ? Carbon::parse($paymentData['date_approved']) : null,
                        'synced_at' => now(),
                    ];

                    // Venda nova (aprovada, nunca vista antes) já busca o
                    // valor líquido/data de liberação NESTA mesma passada —
                    // sem isso, ficava esperando o próximo ciclo do job de
                    // liberação (throttled, prioriza o backlog mais antigo
                    // primeiro), e uma venda recém-sincronizada podia ficar
                    // horas sem esses dados. O volume por sync é pequeno
                    // (só vendas genuinamente novas), diferente de tentar
                    // isso pra toda a base.
                    if ($isNewPayment && $newStatus === 'approved') {
                        $release = $mercadoLivre->getPaymentRelease($this->account, (string) $paymentData['id']);
                        $attributes['net_received_amount'] = $release['net_received_amount'];
                        $attributes['money_release_date'] = $release['money_release_date'];
                        $attributes['released'] = $release['released'] === 'yes';
                        $attributes['ml_fee'] = $release['ml_fee'];
                        $attributes['mp_processing_fee'] = $release['mp_processing_fee'];
                        $attributes['shipping_fee'] = $release['shipping_fee'];
                        $attributes['financing_fee'] = $release['financing_fee'];
                        $attributes['coupon_amount'] = $release['coupon_amount'];
                        $attributes['shipping_charged_on_cancel'] = $release['shipping_charged_on_cancel'];
                    }

                    // Não temos o timestamp exato de quando o ML mudou o
                    // status, só quando NÓS observamos a mudança — por isso
                    // "status_changed_at" só avança quando o status
                    // realmente é diferente do que já tínhamos guardado, em
                    // vez de ser sobrescrito em todo sync.
                    if (! $existing || $existing->status !== $newStatus) {
                        // Pra um pagamento que a gente está vendo pela
                        // primeira vez JÁ num estado finalizado (cancelado,
                        // reembolsado...), "agora" é uma mentira — o status
                        // pode ter mudado há dias/semanas (ex: importação
                        // avulsa, ou o pedido foi cancelado entre um ciclo
                        // de sincronização e outro). Nesses casos busca a
                        // data real na API em vez de cravar `now()`, senão
                        // um lote inteiro de pedidos acaba com a mesma
                        // "data de devolução" — o próprio momento do sync.
                        $isFreshFinalized = $isNewPayment && in_array($newStatus, [
                            'cancelled', 'refunded', 'rejected', 'partially_refunded',
                        ], true);

                        if ($isFreshFinalized) {
                            $release = $mercadoLivre->getPaymentRelease($this->account, (string) $paymentData['id']);
                            $attributes['status_changed_at'] = $release['date_last_updated']
                                ? Carbon::parse($release['date_last_updated'])
                                : now();
                        } else {
                            $attributes['status_changed_at'] = now();
                        }
                    }

                    if ($newStatus === 'in_mediation' && ! $existing?->mediation_detected_at) {
                        $attributes['mediation_detected_at'] = now();
                    }

                    Payment::updateOrCreate(
                        ['mercadolivre_payment_id' => (string) $paymentData['id']],
                        $attributes,
                    );
                    $synced++;
                }
            }

            return $synced;
        });
    }
}
