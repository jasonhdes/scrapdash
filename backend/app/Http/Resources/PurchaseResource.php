<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PurchaseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'occurred_at' => $this->occurred_at?->toDateString(),
            'description' => $this->description,
            'value' => (float) $this->value,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
