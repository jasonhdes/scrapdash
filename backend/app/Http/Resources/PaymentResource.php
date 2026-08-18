<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mercadolivre_payment_id' => $this->mercadolivre_payment_id,
            'status' => $this->status,
            'transaction_amount' => (float) $this->transaction_amount,
            'payment_method' => $this->payment_method,
            'paid_at' => $this->paid_at,
            'money_release_date' => $this->money_release_date,
            'released' => $this->released,
            'ml_fee' => $this->ml_fee !== null ? (float) $this->ml_fee : null,
            'mp_processing_fee' => $this->mp_processing_fee !== null ? (float) $this->mp_processing_fee : null,
            'shipping_fee' => $this->shipping_fee !== null ? (float) $this->shipping_fee : null,
            'financing_fee' => $this->financing_fee !== null ? (float) $this->financing_fee : null,
            'coupon_amount' => $this->coupon_amount !== null ? (float) $this->coupon_amount : null,
            'net_received_amount' => $this->net_received_amount !== null ? (float) $this->net_received_amount : null,
            'synced_at' => $this->synced_at,
            'order' => $this->whenLoaded('order', fn () => [
                'id' => $this->order->id,
                'mercadolivre_order_id' => $this->order->mercadolivre_order_id,
            ]),
        ];
    }
}
