<?php

namespace App\Policies;

use App\Models\Account;
use App\Models\User;

class AccountPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Acesso básico à conta (aparecer no seletor, ver o dashboard) — dono,
     * master, ou qualquer user_partner com alguma permissão atribuída,
     * mesmo que restrita a só um módulo.
     */
    public function view(User $user, Account $account): bool
    {
        if ($user->role === 'master' || $user->id === $account->user_id) {
            return true;
        }

        return $account->employees()->where('user_id', $user->id)->exists();
    }

    public function create(User $user): bool
    {
        return $user->role !== 'user_partner';
    }

    /**
     * Ações de dono da conta: editar/excluir a conta, gerenciar funcionários
     * e permissões, conectar/desconectar o Mercado Livre. Não é delegável
     * por módulo — só o dono (ou master) mexe nisso.
     */
    public function update(User $user, Account $account): bool
    {
        return $user->role === 'master' || $user->id === $account->user_id;
    }

    public function delete(User $user, Account $account): bool
    {
        return $user->role === 'master' || $user->id === $account->user_id;
    }

    public function viewModule(User $user, Account $account, string $module): bool
    {
        return $user->canAccessAccountModule($account, $module, 'view');
    }

    public function manageModule(User $user, Account $account, string $module): bool
    {
        return $user->canAccessAccountModule($account, $module, 'manage');
    }
}
