# Permissões (RBAC)

## Os 3 perfis

| Perfil (`users.role`) | Escopo |
|---|---|
| `master` | Acesso total a **todas** as contas do sistema, de qualquer dono. Não precisa de nenhuma atribuição — o próprio `role` já concede tudo. |
| `user` | Dono de conta(s) de marketplace. Acesso total às **próprias** contas (as que ele criou/possui via `accounts.user_id`). Gerencia funcionários e permissões das suas contas. |
| `user_partner` | "Funcionário". Só acessa as contas explicitamente atribuídas a ele, com as permissões específicas concedidas por conta. Nunca gerencia outros funcionários nem edita a conta em si (conectar/desconectar Mercado Livre), mesmo com permissão total nos módulos operacionais. |

**Decisão tomada com o dono do produto antes de implementar** (Sprint 9): "funcionário" e "User Partner" são o mesmo conceito — um funcionário faz login de verdade no sistema, não é um cadastro passivo. Cada funcionário só vê as contas específicas atribuídas a ele (não todas as do dono automaticamente).

## Módulos e ações

Permissão de `user_partner` é granular por **módulo × ação**, guardada em `account_user.permissions` (JSON):

```json
{
  "products": ["view"],
  "orders": ["view", "manage"],
  "financial": [],
  "messages": ["view"]
}
```

| Módulo | Cobre |
|---|---|
| `products` | Listagem/detalhe de produtos |
| `orders` | Listagem/detalhe/export de pedidos, SKUs |
| `financial` | Pagamentos, resumo financeiro, conciliação |
| `messages` | Conversas de pós-venda |

| Ação | Significado |
|---|---|
| `view` | Ver os dados do módulo (rotas `GET`) |
| `manage` | Ações que alteram algo (marcar pedido como processado, responder mensagem) — **implica** ter `view` na prática (não faz sentido gerenciar sem ver, mas o backend não assume isso automaticamente: conceda os dois se for o caso) |

O Dashboard (`GET /accounts/{account}/dashboard`) não é um módulo separado — qualquer usuário com acesso básico à conta (dono, master, ou funcionário com **qualquer** permissão atribuída) o vê, já que é só um resumo agregado.

Gestão de funcionários (`/accounts/{account}/employees`) **nunca** é delegável — só dono da conta ou master, independente de qualquer permissão de módulo que o funcionário tenha.

## Como é decidido (backend)

Toda a lógica está centralizada em dois lugares:

- `User::canAccessAccountModule(Account $account, string $module, string $action)` (`backend/app/Models/User.php`) — a fonte da verdade. Master sempre `true`; dono sempre `true` na própria conta; `user_partner` consulta `account_user.permissions`.
- `AccountPolicy::viewModule` / `manageModule` (`backend/app/Policies/AccountPolicy.php`) — expõe isso como Gate, chamado em todo controller de módulo:
  ```php
  Gate::forUser($user)->authorize('viewModule', [$account, 'orders']);
  Gate::forUser($user)->authorize('manageModule', [$account, 'orders']);
  ```
- `AccountPolicy::view` / `update` — acesso "básico" (dashboard, aparecer no seletor de contas) vs. ações de dono (editar conta, gerenciar funcionários, conectar Mercado Livre).

Antes do Sprint 9, todo controller usava só `authorize('view'/'update', $account)` — o mesmo check genérico em todo lugar, sem distinguir módulo nenhum (um funcionário com qualquer acesso via a implementação antiga acabaria vendo tudo). Isso foi substituído controller por controller (`ProductController`, `OrderController`, `PaymentController`, `FinancialController`, `MessageController`).

## Como o frontend reflete isso

O frontend **nunca decide** permissão sozinho — só espelha o que o backend manda, pra não ficar dessincronizado nem virar a fonte de verdade por engano:

- `GET /accounts` devolve, em cada conta, o campo `permissions` já resolvido pro usuário autenticado (`AccountResource::resolvePermissions()`).
- `Sidebar` esconde o link de um módulo se `permissions[modulo]` não contém `view`, e esconde o link "Funcionários" se `user.role === 'user_partner'`.
- Isso é só UX (evita cliques que dariam 403) — a aplicação real da regra é sempre no backend. Navegar direto pra uma URL de um módulo sem permissão ainda retorna 403 do backend.

## Auditoria

`audit_logs` registra: criação/edição/remoção de funcionário, pedido marcado/desmarcado como processado, resposta de mensagem. Ver `AuditLogger::log()` (`backend/app/Application/Services/AuditLogger.php`) e `BancoDeDados.md#audit_logs`.

## Testes

`backend/tests/Feature/Rbac/AccountModuleAccessTest.php` cobre: dono acessa a própria conta, dono **não** acessa conta de outro dono, master acessa qualquer conta, funcionário sem permissão de módulo toma 403, funcionário com `view` mas sem `manage` consegue ver mas não alterar, funcionário não atribuído não vê a conta nem em `/accounts`, e só dono/master gerencia funcionários.
