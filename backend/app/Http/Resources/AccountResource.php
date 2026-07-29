<?php

namespace App\Http\Resources;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Auth;

class AccountResource extends JsonResource
{
    /**
     * Módulos que existem no sistema — usado pra sempre devolver as 4
     * chaves preenchidas (mesmo vazias), então o frontend não precisa
     * tratar chave ausente como "sem permissão" de forma implícita.
     *
     * @var array<int, string>
     */
    private const MODULES = ['products', 'orders', 'financial', 'messages'];

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'marketplace' => $this->marketplace,
            'mercadolivre_connected' => $this->isConnectedToMercadoLivre(),
            // Permissões do usuário autenticado NESSA conta — não é sobre a
            // conta em si, é "o que EU posso fazer aqui". O frontend usa
            // isso pra esconder links/telas de módulo que o usuário (tipicamente
            // um user_partner) não tem acesso, em vez de deixar ele clicar
            // e tomar 403.
            'permissions' => $this->resolvePermissions(),
        ];
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function resolvePermissions(): array
    {
        /** @var User|null $user */
        $user = Auth::guard('api')->user();

        if (! $user) {
            return array_fill_keys(self::MODULES, []);
        }

        if ($user->role === 'master' || $user->id === $this->user_id) {
            return array_fill_keys(self::MODULES, ['view', 'manage']);
        }

        $pivot = $this->employees()->where('user_id', $user->id)->first()?->pivot;
        $permissions = $pivot->permissions ?? [];

        $resolved = [];
        foreach (self::MODULES as $module) {
            $resolved[$module] = is_array($permissions[$module] ?? null) ? $permissions[$module] : [];
        }

        return $resolved;
    }
}
