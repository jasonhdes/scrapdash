<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mercadolivre_order_id' => $this->mercadolivre_order_id,
            'pack_id' => $this->pack_id,
            // Só presentes quando o pedido faz parte de um pacote (compra
            // combinada) — `pack_total_amount`/`pack_order_numbers` vêm de
            // 'index' (agregado na própria coleção carregada, sem query
            // extra), `pack_siblings` vem de 'show' (busca os pedidos
            // irmãos pontualmente). Nunca os três ao mesmo tempo.
            'pack_total_amount' => $this->pack_total_amount ?? null,
            'pack_order_numbers' => $this->pack_order_numbers ?? null,
            'pack_siblings' => $this->when(isset($this->pack_siblings), fn () => $this->pack_siblings->map(fn ($sibling) => [
                'id' => $sibling->id,
                'mercadolivre_order_id' => $sibling->mercadolivre_order_id,
                'total_amount' => (float) $sibling->total_amount,
            ])),
            'status' => $this->status,
            'shipping_status' => $this->shipping_status,
            'logistic_type' => $this->logistic_type,
            'total_amount' => (float) $this->total_amount,
            'currency' => $this->currency,
            'buyer_nickname' => $this->buyer_nickname,
            'buyer_city' => $this->buyer_city,
            'buyer_state' => $this->buyer_state,
            'ordered_at' => $this->ordered_at,
            'processed_at' => $this->processed_at,
            'synced_at' => $this->synced_at,
            'in_mediation' => $this->whenLoaded('mediationPayment', fn () => $this->mediationPayment !== null),
            'money_release_date' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->money_release_date),
            'money_released' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->released),
            'paid_amount' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->transaction_amount !== null ? (float) $this->approvedPayment->transaction_amount : null),
            'ml_fee' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->ml_fee !== null ? (float) $this->approvedPayment->ml_fee : null),
            'mp_processing_fee' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->mp_processing_fee !== null ? (float) $this->approvedPayment->mp_processing_fee : null),
            'shipping_fee' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->shipping_fee !== null ? (float) $this->approvedPayment->shipping_fee : null),
            'financing_fee' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->financing_fee !== null ? (float) $this->approvedPayment->financing_fee : null),
            'coupon_amount' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->coupon_amount !== null ? (float) $this->approvedPayment->coupon_amount : null),
            // Já descontado pelas atualizações de devolução/reembolso
            // registradas neste pedido (valor_retido/descontos subtraem,
            // estorno_valor volta) — ver Order::returnsAdjustment().
            'net_received_amount' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->net_received_amount !== null
                ? (float) $this->approvedPayment->net_received_amount - $this->returnsAdjustment()
                : null),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
            'return_statuses' => OrderReturnResource::collection($this->whenLoaded('returns')),
            'return_history' => OrderReturnHistoryResource::collection($this->whenLoaded('returnHistory')),
        ];
    }
}
