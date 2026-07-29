# Fluxos

## Cadastro e login

1. **E-mail/senha**: `POST /auth/register` cria o `User` (`role=user`) e uma `Account` "Conta Principal" vazia (ainda sem Mercado Livre conectado). `POST /auth/login` autentica e devolve `{access_token, expires_in}` (TTL de 60min).
2. **Google**: `POST /auth/google` recebe o ID token do Google Identity Services (gerado no frontend), verifica assinatura/issuer/audience/e-mail-verificado (`GoogleAuthService`) e faz find-or-create por `google_id` ou, se não achar, por `email` (login com Google numa conta que já existia por senha auto-vincula, já que o e-mail já veio verificado pelo Google).

## Conectar o Mercado Livre (OAuth2 + PKCE)

1. Frontend chama `POST /accounts/{account}/mercadolivre/connect` (autenticado, só dono/master).
2. Backend gera `code_verifier`/`code_challenge` (PKCE) e um `state` aleatório, guarda os dois em cache (`Cache`, chave por `state`), devolve a URL de autorização do Mercado Livre.
3. Usuário é redirecionado pro Mercado Livre, autoriza, ML redireciona pro callback: `GET /auth/mercadolivre/callback?code=...&state=...`.
4. Backend valida o `state` (contra o cache — protege contra CSRF nesse fluxo), troca o `code` pelo token usando o `code_verifier` salvo, grava `mercadolivre_access_token`/`refresh_token`/`expires_at` (criptografados) na `Account`.
5. Redireciona de volta pro frontend (`?ml_connected=1` ou `=0&reason=...`).

## Sincronização com o Mercado Livre (background)

Scheduler (`routes/console.php`), processado pela fila (`QUEUE_CONNECTION=database`):

| Job | Frequência | O que faz |
|---|---|---|
| `RefreshTokenJob` | a cada 5min, só se o token expira em <30min | Renova o access token via `refresh_token` |
| `SyncProductsJob` | a cada 15min | Espelha os anúncios (`/items/search` + `/items?ids=...`) |
| `SyncOrdersJob` | a cada 15min | Espelha pedidos (`/orders/search`) + itens de cada pedido; dispara `SyncPaymentsJob` em processo (não via fila — evita estourar `max_allowed_packet` serializando payloads grandes) |
| `SyncMessagesJob` | a cada 15min | Busca mensagens por pack (`/messages/packs/{pack_id}/sellers/{seller_id}`), uma chamada por pack — agrupa pedidos do mesmo pack pra não repetir |
| `SyncPaymentReleaseDatesJob` | a cada 15min, lote de 100 | Busca `money_release_date` por pagamento (`/collections/{id}`, sem busca em lote na API deles) — prioriza sempre os nunca verificados antes de reconferir os vencidos ainda não liberados |
| `SyncOrderAddressesJob` | a cada 15min, lote de 100 | Busca cidade/estado do comprador (`/shipments/{id}`, um envio por vez) — marca toda tentativa (`buyer_address_synced_at`), sucesso ou falha, pra nunca ficar reprocessando um pedido com erro permanente pra sempre |
| `CleanupJob` | diário | Limpeza geral (logs antigos etc.) |

Todos os jobs de sync por lote seguem o mesmo padrão defensivo: erro em **um** registro não aborta o lote inteiro (log de warning + `continue`), e todo processamento marca alguma coisa que impede reprocessar o mesmo registro pra sempre em caso de erro permanente — essa foi uma classe de bug real (loop de reprocessamento infinito) encontrada e corrigida duas vezes ao longo do projeto (`SyncPaymentReleaseDatesJob` primeiro, `SyncOrderAddressesJob` já nasceu corrigido usando a mesma lição).

## Sessão e expiração de token

O JWT dura 60 minutos (`JWT_TTL`) e **não há refresh automático silencioso em background** — a renovação é sempre disparada por uma ação do usuário (clicar em "Atualizar"), nunca um timer invisível guardando token novo sem o usuário saber.

1. `useTokenExpiry` (frontend) decodifica o `exp` do JWT localmente (sem chamada à API) e reavalia a cada 15s.
2. **Faltando ≤5min pra expirar**: aparece um aviso não-bloqueante com botão "Atualizar" — a tela continua 100% usável.
3. **Já expirado**: o conteúdo da página fica borrado, só o botão "Atualizar" fica nítido por cima.
4. Clicar em "Atualizar" chama `POST /auth/refresh` com o token atual. Isso só funciona se o token **ainda não passou** do TTL — a rota fica atrás do middleware `auth:api`, que rejeita token expirado antes mesmo de chegar no controller (não dá pra renovar algo que a autenticação já recusa).
5. Se o refresh falhar (token realmente vencido — equivalente a "1h sem uso"), o interceptor genérico de 401 (`handleExpiredSession` em `frontend/src/services/api.ts`) limpa a sessão local e manda pro `/login`.

**Cuidado com corrida entre login novo e token velho**: se o navegador tinha um token velho salvo (ex.: de ontem) e o usuário faz login de novo rapidinho antes da checagem automática desse token velho (`GET /auth/me` no boot do `AuthContext`) voltar como 401, essa resposta atrasada não pode derrubar a sessão nova. Por isso `handleExpiredSession` só limpa/redireciona se o token que falhou **ainda for** o token salvo no momento — se um login mais novo já trocou, a resposta velha é ignorada. Bug real, já aconteceu, tem teste (`frontend/src/services/api.test.ts`).

## Responder uma mensagem

1. `POST /accounts/{account}/orders/{order}/messages` — exige permissão `manage` no módulo `messages`.
2. Backend resolve todos os pedidos do mesmo pack (pra achar a conversa certa mesmo que `{order}` não seja o pedido "representante" onde as mensagens ficam salvas), pega o `counterpart_id` da mensagem mais recente da conversa.
3. Chama `MercadoLivreService::sendMessage()` (mesmo endpoint de leitura, método POST).
4. Salva a mensagem localmente com `mercadolivre_message_id` temporário (`local-<uniqid>`) — a próxima sincronização substitui pelo id real.
5. Gera entrada em `audit_logs` (`message.replied`).

## Notificação de mensagem não lida

Não há push/websocket — é reflexo do que já está sincronizado: `read_at` nulo numa mensagem `received` conta como não lida. O `NavBar` faz polling de `GET /accounts/{account}/messages` a cada 30s pro badge; o dashboard mostra o mesmo total como alerta clicável.
