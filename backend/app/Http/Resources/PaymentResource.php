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
            'synced_at' => $this->synced_at,
        ];
    }
}
