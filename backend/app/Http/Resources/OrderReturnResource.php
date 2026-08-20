<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderReturnResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_id' => $this->order_id,
            'mercadolivre_order_id' => $this->whenLoaded('order', fn () => $this->order?->mercadolivre_order_id),
            'status' => $this->status,
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'buyer_name' => $this->buyer_name,
            'value' => (float) $this->value,
            'product_name' => $this->product_name,
            'verified' => $this->verified,
            'source' => $this->source,
            'created_at' => $this->created_at,
        ];
    }
}
