<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'price' => (float) $this->price,
            'sale_fee_amount' => $this->sale_fee_amount !== null ? (float) $this->sale_fee_amount : null,
            'net_amount' => $this->sale_fee_amount !== null ? (float) $this->price - (float) $this->sale_fee_amount : null,
            'currency' => $this->currency,
            'available_quantity' => $this->available_quantity,
            'completed_sales_count' => (int) ($this->completed_sales_count ?? 0),
            'status' => $this->status,
            'logistic_type' => $this->logistic_type,
            'permalink' => $this->permalink,
            'thumbnail' => $this->thumbnail,
            'synced_at' => $this->synced_at,
        ];
    }
}
