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
            'money_release_date' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->money_release_date),
            'money_released' => $this->whenLoaded('approvedPayment', fn () => $this->approvedPayment?->released),
            'items' => OrderItemResource::collection($this->whenLoaded('items')),
            'payments' => PaymentResource::collection($this->whenLoaded('payments')),
        ];
    }
}
