<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mercadolivre_item_id' => $this->mercadolivre_item_id,
            'title' => $this->title,
            'seller_sku' => $this->seller_sku,
            'quantity' => $this->quantity,
            'unit_price' => $this->unit_price === null ? null : (float) $this->unit_price,
            'currency' => $this->currency,
        ];
    }
}
