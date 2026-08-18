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
            'status' => $this->status,
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
            'net_received_amount' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->net_received_amount !== null ? (float) $this->approvedPayment->net_received_amount : null),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
        ];
    }
}
