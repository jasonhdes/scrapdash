# API

Base URL em dev: `http://scrapdash.local/api`. Todas as respostas em JSON; requisições autenticadas usam `Authorization: Bearer <jwt>`.

## Autenticação

| Método | Rota | Auth | Rate limit | Descrição |
|---|---|---|---|---|
| POST | `/auth/register` | não | 10/min por IP | Cria usuário (`role=user`) + Account principal |
| POST | `/auth/login` | não | 10/min por IP | Login por e-mail/senha |
| POST | `/auth/google` | não | 10/min por IP | Login/cadastro via Google ID token |
| GET | `/auth/me` | sim | 120/min por usuário | Usuário autenticado atual |
| POST | `/auth/refresh` | sim | 120/min por usuário | Renova o token — **só funciona se o token atual ainda não expirou** (o middleware `auth:api` rejeita token expirado antes de chegar no controller) |
| POST | `/auth/logout` | sim | 120/min por usuário | Invalida o token (blacklist) |

O limite de `/auth/*` público é mais restrito (10/min por IP) de propósito — são os endpoints alvo de força bruta de credencial. O resto da API usa 120/min por usuário autenticado (cai pro IP se por algum motivo não identificar o usuário).

## Contas

| Método | Rota | Descrição |
|---|---|---|
| GET | `/accounts` | Lista as contas acessíveis pro usuário logado — master vê todas, dono vê as suas, funcionário vê só as atribuídas a ele. Cada conta vem com `permissions` (o que **esse** usuário pode fazer nela, por módulo) |
| POST | `/accounts/{account}/mercadolivre/connect` | Inicia OAuth2+PKCE com o Mercado Livre (só dono/master) |

## Dashboard

| Método | Rota | Descrição |
|---|---|---|
| GET | `/accounts/{account}/dashboard` | KPIs agregados (receita, pedidos, produtos, pagamentos, mensagens) + alertas (token expirando, sync falhando, mensagens não lidas). Filtra por `start_date`/`end_date`. Cacheado 30s |

## Produtos — módulo `products`

| Método | Rota | Permissão necessária |
|---|---|---|
| GET | `/accounts/{account}/products` | `view` — filtros: `status`, `search` |
| GET | `/accounts/{account}/products/{product}` | `view` |

## Pedidos — módulo `orders`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/accounts/{account}/orders` | `view` | Filtros: `order_number`, `buyer`, `location`, `product`, `skus[]`, `min_total`, `max_total`, `status`, `released`, `processed`, `start_date`/`end_date`, `sort_by`, `sort_dir` |
| GET | `/accounts/{account}/orders/{order}` | `view` | Detalhe com itens e pagamentos |
| GET | `/accounts/{account}/orders/export` | `view` | CSV com os mesmos filtros/ordenação da listagem |
| GET | `/accounts/{account}/orders/sku-options` | `view` | SKUs distintos já vendidos (alimenta o filtro de seleção múltipla) |
| PATCH | `/accounts/{account}/orders/{order}/processed` | `manage` | Marca/desmarca processado (campo local, não mexe no Mercado Livre) — gera entrada de auditoria |

`sort_by` aceita: `ordered_at`, `total_amount`, `mercadolivre_order_id`, `buyer_nickname`, `status`, `money_release_date` (allowlist fixa no controller — nunca aceita coluna arbitrária vinda do cliente).

## Mensagens — módulo `messages`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/accounts/{account}/messages` | `view` | Lista conversas (uma por pedido/pack) com última mensagem e contagem de não lidas |
| GET | `/accounts/{account}/orders/{order}/messages` | `view` | Thread completa da conversa daquele pedido |
| POST | `/accounts/{account}/orders/{order}/messages` | `manage` | Responde a conversa (envia pro Mercado Livre e salva local) — gera entrada de auditoria |

## Financeiro — módulo `financial`

| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| GET | `/accounts/{account}/payments` | `view` | Extrato de pagamentos — filtros `status`, `payment_method`, `start_date`/`end_date` |
| GET | `/accounts/{account}/financial/summary` | `view` | Total recebido, quebra por status e método |
| GET | `/accounts/{account}/financial/reconciliation` | `view` | Pedidos pagos com valor divergente do total aprovado |

## Funcionários (só dono/master — não é delegável por módulo)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/accounts/{account}/employees` | Lista quem tem acesso a essa conta e com quais permissões |
| POST | `/accounts/{account}/employees` | Cria um `user_partner` novo e concede acesso a essa conta |
| PATCH | `/accounts/{account}/employees/{employee}` | Atualiza nome/permissões |
| DELETE | `/accounts/{account}/employees/{employee}` | Remove o acesso a essa conta (não apaga o usuário — ele pode ter acesso a outras contas) |

## Convenções de resposta

- Listagens paginadas: `{"data": [...], "meta": {"current_page", "last_page", "total", ...}, "links": [...]}` (formato padrão do `paginate()` do Laravel).
- Coleções não-paginadas (ex.: conversas, conciliação): `{"data": [...], "meta": {...}}`.
- Erro de validação: HTTP 422, `{"message": "...", "errors": {"campo": ["mensagem"]}}`.
- Sem permissão: HTTP 403, `{"message": "This action is unauthorized."}`.
- Token ausente/inválido/expirado: HTTP 401, `{"message": "Token inválido, expirado ou ausente."}`.
- Limite de requisições excedido: HTTP 429.

## Callback OAuth (fora do prefixo `/api`)

`GET /auth/mercadolivre/callback` (`routes/web.php`) — rota pública (não usa Bearer token, é acessada pelo navegador via redirect do Mercado Livre). Protegida por validação de `state` (CSRF do fluxo OAuth), não por autenticação.
