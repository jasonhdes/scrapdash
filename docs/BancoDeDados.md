# Banco de Dados

MySQL/MariaDB em produção e desenvolvimento; SQLite em memória nos testes automatizados (por isso qualquer migration com SQL específico de driver precisa checar `DB::getDriverName()` — ver a migration `add_user_partner_role_to_users_table` como exemplo).

## Tabelas de domínio

### `users`
Conta de login — cobre os 3 perfis (`role`: `master` | `user` | `user_partner`). Não existe tabela separada para "funcionário": um funcionário É um `user` com `role=user_partner` (decisão do Sprint 9, ver `Permissoes.md`).

| Coluna | Notas |
|---|---|
| `role` | enum `master`/`user`/`user_partner`, default `user` |
| `google_id` | nullable, preenchido só em login via Google |
| `password` | sempre hasheado (`bcrypt`), mesmo para login via Google (gera senha aleatória não usada) |

### `accounts`
Uma conta de marketplace (hoje só Mercado Livre) pertencente a um `user` (dono).

| Coluna | Notas |
|---|---|
| `user_id` | dono da conta — só ele (ou master) pode editar/conectar/gerenciar funcionários |
| `mercadolivre_user_id` / `mercadolivre_access_token` / `mercadolivre_refresh_token` / `mercadolivre_token_expires_at` | tokens criptografados (cast `encrypted`), nunca aparecem em `AccountResource` (`$hidden`) |

### `account_user` (pivot)
Concede acesso de **funcionário** (`user_partner`) a uma conta específica — não existe "acesso automático a todas as contas do dono".

| Coluna | Notas |
|---|---|
| `account_id`, `user_id` | únicos em conjunto (um funcionário só tem uma linha de permissão por conta) |
| `permissions` | JSON, ex.: `{"products": ["view"], "orders": ["view","manage"], "financial": [], "messages": []}` — ver `Permissoes.md` pro significado |

Usa o Pivot model dedicado `App\Models\AccountUser` (não o Pivot genérico do Laravel) — necessário pro cast de `permissions` como array funcionar em `attach()`/`updateExistingPivot()` (bug real encontrado e corrigido no Sprint 9: sem isso, o Laravel tenta gravar um array PHP cru na coluna e o PDO quebra com "Array to string conversion").

### `products`
Espelho somente-leitura dos anúncios do Mercado Livre (`SyncProductsJob`). Nunca é escrito de volta pra API deles.

| Coluna | Notas |
|---|---|
| `seller_sku` | vem do atributo `SELLER_SKU` da API de itens — só existe pra produto **sem** variação (com variação, cada uma pode ter SKU diferente, então fica nulo) |

### `orders`
Pedidos sincronizados (`SyncOrdersJob`).

| Coluna | Notas |
|---|---|
| `ordered_at` | data real da venda (`date_created` da API) — **não confundir** com `synced_at` (quando nós buscamos) |
| `pack_id` | agrupa pedidos da mesma compra (várias unidades/itens comprados juntos) — pode ser nulo |
| `shipping_id` | id do envio na API do ML, usado só pra buscar o endereço (`SyncOrderAddressesJob`) |
| `buyer_city` / `buyer_state` / `buyer_address_synced_at` | endereço do comprador — a API só devolve isso numa chamada separada por envio (`GET /shipments/{id}`), então é preenchido em lote por um job à parte, não no sync principal |
| `processed_at` | campo **local**, não existe no Mercado Livre — "marcar como processado" é só controle interno do vendedor |

### `order_items`
Itens de cada pedido (nome, SKU, quantidade, preço unitário). Recriado inteiro a cada sincronização daquele pedido (delete + insert) — itens de um pedido já feito não mudam, então não precisa de upsert item a item.

### `payments`
Pagamentos de cada pedido (`SyncPaymentsJob`).

| Coluna | Notas |
|---|---|
| `paid_at` | data real de aprovação (`date_approved` da API) |
| `money_release_date` / `released` | data prevista/real de liberação do dinheiro — só vem no endpoint legado `/collections/{id}` (uma chamada por pagamento), preenchido em lote por `SyncPaymentReleaseDatesJob` |

**Cuidado ao consultar "o pagamento mais recente aprovado" de um pedido** (`Order::approvedPayment()`): usa `latestOfMany('id')`, não `latestOfMany('paid_at')`. Já foi `paid_at` e causou um bug real — ~3% dos pagamentos aprovados vêm com `paid_at` nulo da API do ML, e o join interno do `latestOfMany` nunca casa quando o critério de "mais recente" é nulo, fazendo a relação inteira virar `null` mesmo com dado real disponível. `id` nunca é nulo.

### `messages`
Mensagens de pós-venda (perguntas do comprador, respostas do vendedor), agrupadas por pedido/pack.

| Coluna | Notas |
|---|---|
| `direction` | `sent` (nós) ou `received` (comprador) |
| `sent_at` / `read_at` | vêm de `message_date.received`/`message_date.created` e `message_date.read` da API — mensagem sem `read_at` conta como não lida pro badge de notificação |
| `counterpart_id` | id do usuário do outro lado da conversa — necessário pra poder responder (a API de envio pede `to.user_id` explícito) |
| `order_id` | aponta pro pedido "representante" do pack — pedidos que compartilham pack **não** têm cada um sua própria cópia das mensagens (ver `MessageController::conversationOrderIds()`) |

### `sync_logs`
Histórico de execução de cada job de sincronização (sucesso/falha, quantos itens processados) — alimenta os alertas de "sincronização falhando" no dashboard.

### `audit_logs`
Trilha de auditoria (Sprint 10). Append-only (sem `updated_at`).

| Coluna | Notas |
|---|---|
| `action` | string livre, ex.: `employee.created`, `order.marked_processed`, `message.replied` |
| `subject_type` / `subject_id` | polimórfico manual (não usa `morphs()` do Laravel, só duas colunas simples) |
| `meta` | JSON livre com contexto extra da ação |

## Relacionamentos principais

```
User 1───N Account (dono)
User N───N Account (via account_user, como funcionário — user_partner)
Account 1───N Product / Order / Message / SyncLog
Order 1───N OrderItem / Payment / Message
```

## Tabelas de infraestrutura do Laravel

`cache`, `jobs` (fila `QUEUE_CONNECTION=database`), `sessions` não é usada como mecanismo de auth (a API é stateless via JWT) — existe só porque é padrão do scaffold do Laravel.
