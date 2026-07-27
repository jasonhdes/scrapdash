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
            'price' => (float) $this->price,
            'currency' => $this->currency,
            'available_quantity' => $this->available_quantity,
            'status' => $this->status,
            'permalink' => $this->permalink,
            'thumbnail' => $this->thumbnail,
            'synced_at' => $this->synced_at,
        ];
    }
}
