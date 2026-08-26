<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderReturnHistoryResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'status' => $this->status,
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'buyer_name' => $this->buyer_name,
            'value' => (float) $this->value,
            'product_name' => $this->product_name,
            'source' => $this->source,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
