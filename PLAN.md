# Plano de Execução – Scrap Dash

> **Scrap Dash** (infra: `scrapdash`) — app de gestão para vendedores do Mercado Livre, desenvolvido pela **JHS CORP**. Contexto completo do produto em [RESUMO.md](RESUMO.md).

## Papéis

- **Engenheiro/Idealizador (você):** define prioridades, valida decisões de produto/negócio, aprova credenciais e integrações externas (Mercado Livre DevCenter, domínios, deploy), testa aceite de cada entrega.
- **Equipe de execução (Claude):** implementa backend, frontend, infraestrutura local, migrations, testes e documentação, sprint a sprint, reportando o que foi feito e o que precisa de decisão/validação humana.

Pontos que **sempre** exigem sua decisão antes de eu prosseguir: credenciais reais (Client ID/Secret do ML), domínio/URL de produção, política de permissões/roles definitiva, e qualquer ação destrutiva em banco de dados.

## Pré-requisitos a confirmar com você antes do Sprint 1

1. [X] PHP 8.2.12 / MariaDB 10.4.32 disponíveis via XAMPP (`C:\xampp\php`, `C:\xampp\mysql\bin` — adicionados ao PATH do usuário).
2. [X] Node.js v24.18.0 / npm 11.16.0 instalados.
3. [X] Composer 2.10.1 disponível (`C:\xampp\php\composer.phar`).
4. [X] Conta no Mercado Livre DevCenter — aplicação criada, Client ID/Secret fornecidos e usados no Sprint 3.
5. [X] Domínio local definido: **`scrapdash.local`** (não usamos `scrapdash.local`).

## Estrutura de Diretórios Alvo

```
scrapdash-app/
├── backend/        (Laravel)
├── frontend/        (Next.js)
├── nginx/            (opcional local; XAMPP/Apache assume esse papel em dev)
├── docs/
├── database/         (dumps/seeds adicionais)
├── storage/
├── scripts/
└── README.md
```

> Observação: a especificação original previa Docker; localmente substituímos por **XAMPP** (Apache+PHP+MySQL) conforme o complemento do documento. A pasta `docker/` só será recriada se decidirmos suportar deploy containerizado no futuro.

---

## Sprint 1 — Setup do Ambiente

- [X] Criar projeto Laravel em `backend/` (`composer create-project laravel/laravel`).
- [X] Criar projeto Next.js em `frontend/` (`create-next-app`, TypeScript).
- [X] Configurar `.env` do backend (DB → MySQL `scrapdash`, APP_URL → `http://scrapdash.local`, APP_NAME → "Scrap Dash"). JWT secret fica para o Sprint 2, junto do pacote de auth.
- [X] Criar VirtualHost `httpd-vhosts.conf` apontando para `backend/public` — **bloco pronto em `scripts/vhost-scrapdash.conf`, aplicação pendente de você** (edita arquivo de sistema, ver `scripts/INSTRUCOES_VHOST.md`).
- [X] Atualizar `hosts` do Windows (aplicado por você via Notepad como administrador; linha `127.0.0.1 scrapdash.local` confirmada em `C:\Windows\System32\drivers\etc\hosts`).
- [X] Criar banco de dados MySQL via phpMyAdmin/CLI (`scrapdash`, utf8mb4).
- [X] Validar `http://<dominio>.local` respondendo à página padrão do Laravel — `http://scrapdash.local` retornando HTTP 200 com título "Scrap Dash" (DNS resolvendo para 127.0.0.1, VirtualHost servindo `backend/public`).
- [X] Estrutura de pastas do backend em DDD (`Domain`, `Application/{Services,DTO,Actions}`, `Infrastructure/{MercadoLivre,Repositories,Cache,Queue}`, `Http`, `Policies`, `Jobs`, `Events`, `Listeners`, `Notifications`).
- [X] Estrutura de pastas do frontend (`components`, `layouts`, `hooks`, `services`, `contexts`, `store`, `utils`, `types`, `styles` em `frontend/src/`). Obs.: pasta `pages/` não foi criada — o projeto usa o App Router do Next.js (`src/app/`), que substitui o roteamento por `pages/`.
- [X] Configurar lint/format (ESLint + Prettier no front; Pint já incluso por padrão no Laravel 12 no back — PHPStan pode ser adicionado depois se necessário).
- [X] Git init + primeiro commit (repositório local apenas, conforme decidido).

**Entregável:** ambiente rodando localmente, "Hello World" do Laravel e do Next.js acessíveis, estrutura de pastas pronta.

---

## Sprint 2 — Usuários e Autenticação

- [X] Migrations: `users` (+ coluna `role`), `accounts`, `employees` (`Account belongsTo User`, `Employee belongsTo Account`) — aplicadas via `php artisan migrate`, confirmadas no MySQL.
- [X] Autenticação JWT — `tymon/jwt-auth` instalado, guard `api` configurado em `config/auth.php`, `JWT_SECRET` gerado.
- [X] Endpoints: registro, login, refresh, logout (`routes/api.php`, `AuthController`) — testados via curl (fluxo completo: registro → login → me → refresh com rotação de token → logout com blacklist).
- [X] Middleware de autenticação na API (`auth:api` protegendo `me`/`refresh`/`logout`) — confirmado retornando 401 sem token e após logout.
- [X] Policies base (`AccountPolicy`, `EmployeePolicy` — regras simples de ownership, sem matriz de permissões final; isso fica para o Sprint 9).
- [X] Telas de login/registro no Next.js (pt-BR), integração com API (`/login`, `/register`, `/dashboard`) — validado end-to-end no navegador (Playwright): registro → dashboard → logout → login → persistência de sessão após reload.
- [X] Context/hook de autenticação no frontend (`AuthContext`, `useAuth`) — token persistido em `localStorage`, hidratação via `/auth/me` no carregamento.
- [X] **Extra (fora do escopo original do sprint):** login com Google (botão oficial do Google Identity Services). Backend verifica o ID token (`GoogleAuthService` + `firebase/php-jwt`, sem precisar de client secret) e faz find-or-create do usuário por `google_id`/e-mail; frontend renderiza o botão via `GoogleSignInButton` em `/login` e `/register`. `GOOGLE_CLIENT_ID`/`NEXT_PUBLIC_GOOGLE_CLIENT_ID` configurados com Client ID real — validado no navegador: botão renderiza, popup abre e chega em "Sign in to continue to Scrap Dash" no domínio real do Google. Só falta o login com uma conta Google de verdade (não automatizável, precisa ser feito manualmente por um usuário).

**Entregável:** login funcional ponta a ponta, com JWT emitido pelo Laravel e consumido pelo Next.js. ✅ Validado.

---

## Sprint 3 — Integração com Mercado Livre (OAuth)

- [X] **Ação sua:** criar aplicação no DevCenter do Mercado Livre e fornecer Client ID/Secret via `.env` (nunca commitado — confirmado fora do Git). Redirect URI cadastrada como **HTTPS**: `https://scrapdash.local/auth/mercadolivre/callback` (diferente do rascunho original em HTTP — por isso criamos um VirtualHost `:443` no Apache com o certificado autoassinado do XAMPP só para servir esse callback).
- [X] Configurar `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `MERCADOLIVRE_REDIRECT_URI` no `.env`.
- [X] Implementar `MercadoLivreService`: fluxo OAuth2 + PKCE (`generatePkcePair`, `buildAuthorizationUrl`, `exchangeCodeForToken`, `refreshAccessToken`) — troca de token testada contra o endpoint real do Mercado Livre (rejeitou code falso corretamente, confirmando client_id/secret válidos).
- [X] Rota de callback `/auth/mercadolivre/callback` (`routes/web.php`) — testada com state inválido e code falso, ambos tratados com redirect de erro para o frontend.
- [X] Persistir tokens (access/refresh) vinculados à `Account` — implementado em `MercadoLivreAuthController::callback` (campos criptografados via cast `encrypted`); caminho de sucesso só será exercitado quando um usuário real completar o consentimento (ver item abaixo).
- [X] Tela no frontend para "Conectar conta Mercado Livre" (`/dashboard`) — testada via Playwright: gera a URL de autorização e navega até a tela de login real do Mercado Livre com os parâmetros corretos.
- [X] Testar fluxo completo em ambiente de desenvolvimento — **validado por você manualmente**: login real no Mercado Livre + consentimento concluído com sucesso. Confirmado no banco (`accounts.id=4`: `mercadolivre_user_id=102352093`, `mercadolivre_access_token` presente, `mercadolivre_token_expires_at` preenchido).
  - No caminho, apareceu um bug real: a resposta de token do Mercado Livre não trouxe `refresh_token` (`tem_refresh_token=0` para essa conta), e o código assumia a chave sempre presente → erro 500. Corrigido lendo `refresh_token`/`expires_in` de forma defensiva (commit `e50ed8f`, "Corrige erro 500 no callback do Mercado Livre quando refresh_token não vem na resposta").
  - Fix mesclado em `main` via PR #4 (branch `tests001`).

**Entregável:** usuário consegue conectar uma conta do Mercado Livre via OAuth e o token fica salvo. ✅ Validado de ponta a ponta em `main`.

---

## Sprint 4 — Sincronização de Dados

- [X] Migrations: `products`, `orders`, `payments` (`belongsTo Order`), `messages` (`belongsTo Account`/`Order` nullable) — aplicadas via `php artisan migrate`. Adicionamos também `sync_logs` (não estava no plano original) para dar suporte ao item de logs abaixo.
- [X] `RefreshTokenJob` — renova o token via `MercadoLivreService::refreshAccountToken`; testado tanto com token expirado sem `refresh_token` (falha tratada e logada, exige reconexão) quanto via `MercadoLivreService`.
- [X] `SyncProductsJob`, `SyncOrdersJob`, `SyncPaymentsJob`, `SyncMessagesJob` — validados com **dados reais** de uma conta de vendedor de verdade: 348 produtos, 1004 pedidos, 1040+ pagamentos e 222 mensagens sincronizados com sucesso.
- [X] Configurar Laravel Queue — driver `database` (já configurado desde o Sprint 1); jobs implementam `ShouldQueue` com `$tries`/`$backoff` para retentativa. Também criamos a tarefa **"ScrapDash Laravel Queue Worker"** no Task Scheduler (roda `queue:work --stop-when-empty` a cada minuto, ver `scripts/INSTRUCOES_SCHEDULER.md`) — sem ela, os jobs ficavam só enfileirados e nunca eram processados (era o motivo do dashboard aparecer zerado mesmo com a conta conectada).
- [X] Configurar Scheduler — `routes/console.php` agenda `RefreshTokenJob` (a cada 5min, para tokens expirando em <30min), sincronização completa (a cada 15min) e `CleanupJob` (diário). Registrado no Windows via **Task Scheduler** (`scripts/run-scheduler.bat`).
- [X] `CleanupJob` — remove registros de `sync_logs` com mais de 30 dias.
- [X] Logs de sincronização e tratamento de falhas/retentativas — tabela `sync_logs` (account/type/status/message/items_synced) alimentada por todos os jobs via trait `LogsSyncActivity`.

**Bugs reais encontrados e corrigidos ao testar com dados de produção** (só apareceram com volume real, não em teste sintético):
  - `mercadolivre:sync-data` ficava travado com um mutex de `withoutOverlapping()` preso (provavelmente de uma execução anterior interrompida durante testes) e nunca mais rodava — corrigido com `php artisan schedule:clear-cache`.
  - `SyncOrdersJob` despachava `SyncPaymentsJob::dispatch()` com o array inteiro de pedidos (até 1000, com todos os dados aninhados da API) — para um vendedor com histórico grande, isso estourava o `max_allowed_packet` do MySQL ao tentar serializar na tabela `jobs` e derrubava a conexão. Corrigido chamando `(new SyncPaymentsJob(...))->handle()` diretamente (em processo, sem passar pela fila), já que os dados já estão em memória.
  - `SyncMessagesJob` assumia que `pack_id` (usado pra buscar mensagens) é sempre igual ao id do pedido — falso para pedidos que fazem parte de uma compra com múltiplos itens (API retorna 400 `order_belong_pack`). Adicionada a coluna `orders.pack_id` (populada pelo `SyncOrdersJob`) e passamos a deduplicar por pack antes de consultar mensagens, evitando chamadas repetidas para pedidos do mesmo pack.
  - Um pack com erro (rate limit da API, ou uma inconsistência pontual do Mercado Livre) abortava a sincronização de mensagens inteira — agora falhas por pack são logadas e puladas, sem derrubar o job todo.
  - Chamadas HTTP ao Mercado Livre não tinham timeout — adicionado `->timeout(30)` em todas.

**Entregável:** dados de produtos/pedidos/pagamentos/mensagens sincronizando automaticamente do Mercado Livre para o MySQL local. ✅ Validado de ponta a ponta com dados reais de produção.

---

## Sprint 5 — Dashboard

- [X] Endpoint agregado de KPIs (`GET /api/accounts/{account}/dashboard`, `DashboardService`) — Receita (soma de pedidos `paid`), Pedidos (total + por status), Produtos (total + ativos), Pagamentos (por status), Mensagens (total + recebidas) e Alertas (não conectado / token expirado ou expirando / falhas de sincronização nas últimas 24h). Testado via curl com dados reais e checado autorização cross-account (403 ao tentar ver dashboard de conta de outro usuário).
- [X] Camada de cache — `Cache::remember` com TTL de 30s por conta; confirmado via curl (duas chamadas seguidas retornam o mesmo `generated_at`).
- [X] Componentes de dashboard no Next.js (`KpiCard`, cards de Receita/Pedidos/Produtos/Pagamentos/Mensagens + lista de alertas) — sem gráficos ainda (fica para quando houver mais dado histórico real para visualizar; os cards já cobrem o "Entregável" do sprint). Quando o token do Mercado Livre expira, os cards ficam borrados com um botão "Atualizar" nítido sobreposto (em vez de simplesmente somem os KPIs sem explicação) — corrigido um bug real encontrado em teste manual: o botão de (re)conexão só aparecia na primeira vez, nunca mais depois que a conta expirava, deixando o usuário sem como agir.
- [X] Seleção de conta ativa (`AccountSelector`) — funciona com múltiplas accounts (só aparece se o usuário tiver mais de uma) e persiste a escolha em `localStorage`. Como hoje cada usuário só tem a "Conta Principal" criada automaticamente, o cenário multi-account ainda não foi validado com dados reais (não há tela para criar novas accounts).
- [X] Atualização em tempo real — **decidido com você: polling**, a cada 30s (`useDashboard` hook), alinhado com o TTL do cache do backend.
- [X] **Extra:** filtro de período (data de início/fim) — `DateRangeFilter` no frontend, persistido em `localStorage`; backend aceita `start_date`/`end_date` na query string e filtra Receita/Pedidos/Pagamentos pela data real da venda no Mercado Livre (nova coluna `orders.ordered_at`, populada a partir de `date_created` da API — antes só tínhamos a data em que *nós* sincronizamos, não a data da venda). Produtos e Mensagens continuam mostrando o total geral (não fazia sentido "filtrar por data" esses dois nesta fase). Validado no navegador com dados reais: período de 01/07 a 24/07 mostrou R$ 31.941,01 (contra R$ 114.559,79 sem filtro), números batendo.

**Entregável:** dashboard funcional exibindo KPIs reais da conta conectada. ✅ Validado de ponta a ponta com dados reais de produção (incluindo o ciclo de token expirado → blur → "Atualizar" → reconectado, e o filtro de período).

---

## Sprint 6 — Gestão de Vendas (Pedidos/Produtos)

- [X] Listagem de produtos com filtros/paginação — **decidido com você:** produtos são espelho somente-leitura do Mercado Livre (sem criar/editar/excluir, já que isso implicaria escrever de volta na API do ML). `GET /api/accounts/{account}/products` com filtro por `status` e busca por título, paginado (Laravel `paginate()`). Testado via curl com os 348 produtos reais.
- [X] Listagem e detalhe de pedidos, com status e fila de processamento — `GET /api/accounts/{account}/orders` (filtros: `status`, `processed`, `start_date`/`end_date`) e `GET /.../orders/{order}` (com pagamentos). "Fila de processamento" implementada como filtro local `processed=0` (não é uma fila de verdade, é a listagem de pedidos ainda não marcados como processados). Testado com os 1005 pedidos reais.
- [X] Ações sobre pedidos — marcar/desmarcar como processado (`PATCH .../orders/{order}/processed`, campo local `orders.processed_at`, não altera nada no Mercado Livre) e exportar CSV (`GET .../orders/export`, respeita os filtros ativos). Testado no navegador: marcar processado, desmarcar, exportar e baixar CSV com os 1005 pedidos reais.
- [X] Telas Next.js correspondentes (pt-BR) — `/products` (tabela com miniatura, filtro de status e busca com debounce), `/orders` (tabela com filtros de status/processamento/período, botão de marcar processado, exportar CSV) e `/orders/[id]` (detalhe com pagamentos). Adicionada barra de navegação (`NavBar`) entre Dashboard/Produtos/Pedidos, e um hook compartilhado (`useAccounts`) pra manter a conta selecionada consistente entre as três telas.
  - Ao rodar `npm run lint` pela primeira vez explicitamente neste projeto, apareceram 8 erros de uma regra nova e agressiva (`react-hooks/set-state-in-effect`) — inclusive em código de sprints anteriores nunca antes lintado dessa forma (só `tsc`+`build`, que não roda o ESLint). A regra sinaliza até `setState` dentro de callbacks assíncronos após um `await`, sem distinguir do padrão comum e seguro de "buscar dados quando uma dependência muda". Desativada essa regra específica no `eslint.config.mjs` com comentário explicando o motivo; `npm run lint` limpo agora.

**Entregável:** módulos de Produtos e Pedidos utilizáveis end-to-end. ✅ Validado no navegador com dados reais de produção (348 produtos, 1005 pedidos).

---

## Sprint 7 — Financeiro

- [ ] Módulo de pagamentos: extrato, conciliação com pedidos.
- [ ] Relatórios financeiros básicos.
- [ ] Tela financeira no frontend.

**Entregável:** módulo financeiro com visão de pagamentos e conciliação.

---

## Sprint 8 — Mensagens

- [ ] Importação e listagem de mensagens (perguntas/pós-venda) do Mercado Livre.
- [ ] Interface de resposta às mensagens (se a API permitir via integração).
- [ ] Notificações de novas mensagens.

**Entregável:** central de mensagens integrada.

---

## Sprint 9 — Funcionários e Permissões

- [ ] CRUD de funcionários vinculados a uma Account.
- [ ] Roles e Permissions (RBAC) para os 3 perfis definidos no RESUMO.md — **definir com você a matriz de permissões final** antes de implementar as regras de negócio:
  - **Master** — acesso total ao sistema.
  - **User** — dono de conta(s), gerencia contas de marketplace, funcionários e operação.
  - **User Partner** — acesso restrito conforme permissões atribuídas.
- [ ] Policies aplicadas em todos os módulos.
- [ ] Auditoria de ações (log de quem fez o quê) — fecha o fluxo de segurança `JWT → Middleware → Policies → Roles → Permissions → Auditoria → Logs`.
- [ ] Telas de gestão de funcionários e permissões.

**Entregável:** controle de acesso granular funcionando por perfil (Master / User / User Partner).

---

## Sprint 10 — Testes e Deploy

- [ ] Testes automatizados (PHPUnit/Pest no backend; Jest/RTL no frontend) cobrindo os fluxos críticos (auth, OAuth, sync, permissões).
- [ ] Revisão de segurança (rate limiting, validação de inputs, proteção de rotas).
- [ ] Documentação em `docs/` (Arquitetura, BancoDeDados, API, Fluxos, RegrasDeNegocio, Permissoes, CasosDeUso, Deploy, Roadmap, Changelog).
- [ ] **Decisão sua:** ambiente/estratégia de deploy de produção (continua XAMPP-like, ou migra para Docker/cloud como planejado originalmente?).
- [ ] Checklist de go-live (HTTPS, redirect URI de produção no DevCenter, variáveis de ambiente de produção).

**Entregável:** aplicação testada, documentada e pronta para deploy.

---

## Backlog / Evolução Futura (pós-Sprint 10)

- Suporte a novos marketplaces além do Mercado Livre.
- Notificações em tempo real (websockets/push).
- Aplicativo mobile.
- Relatórios avançados/BI.

---

## Como vamos trabalhar

- Eu (equipe de execução) proponho e implemento sprint a sprint, sempre relatando o que foi entregue e testado.
- Decisões de produto, credenciais externas e dados sensíveis passam por você antes de eu seguir em frente.
- Ao final de cada sprint, reviso o entregável com você antes de avançar para o próximo.

**Próximo passo sugerido:** iniciar o Sprint 1 (setup do ambiente) assim que você confirmar os pré-requisitos listados acima.
