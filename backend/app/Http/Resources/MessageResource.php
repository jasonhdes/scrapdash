<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mercadolivre_message_id' => $this->mercadolivre_message_id,
            'direction' => $this->direction,
            'text' => $this->text,
            'status' => $this->status,
            'sent_at' => $this->sent_at,
            'read_at' => $this->read_at,
        ];
    }
}
