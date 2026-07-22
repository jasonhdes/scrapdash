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
4. [ ] Conta no Mercado Livre DevCenter — a confirmar antes do Sprint 3.
5. [X] Domínio local definido: **`scrapdash.local`** (não usamos `nooemflow.local`).

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
- [ ] Atualizar `hosts` do Windows (requer permissão administrativa — **ação sua ou aprovação explícita**, pois edita arquivo de sistema). Instruções em `scripts/INSTRUCOES_VHOST.md`.
- [X] Criar banco de dados MySQL via phpMyAdmin/CLI (`scrapdash`, utf8mb4).
- [ ] Validar `http://<dominio>.local` respondendo à página padrão do Laravel — validado via `php artisan serve` (HTTP 200, título "Scrap Dash"); falta validar no domínio `scrapdash.local` após VirtualHost/hosts serem aplicados.
- [X] Estrutura de pastas do backend em DDD (`Domain`, `Application/{Services,DTO,Actions}`, `Infrastructure/{MercadoLivre,Repositories,Cache,Queue}`, `Http`, `Policies`, `Jobs`, `Events`, `Listeners`, `Notifications`).
- [X] Estrutura de pastas do frontend (`components`, `layouts`, `hooks`, `services`, `contexts`, `store`, `utils`, `types`, `styles` em `frontend/src/`). Obs.: pasta `pages/` não foi criada — o projeto usa o App Router do Next.js (`src/app/`), que substitui o roteamento por `pages/`.
- [X] Configurar lint/format (ESLint + Prettier no front; Pint já incluso por padrão no Laravel 12 no back — PHPStan pode ser adicionado depois se necessário).
- [X] Git init + primeiro commit (repositório local apenas, conforme decidido).

**Entregável:** ambiente rodando localmente, "Hello World" do Laravel e do Next.js acessíveis, estrutura de pastas pronta.

---

## Sprint 2 — Usuários e Autenticação

- [ ] Migrations: `users`, `accounts`, `employees` (com relacionamento User → Accounts, User → Employees).
- [ ] Autenticação JWT (ex.: `tymon/jwt-auth` ou Sanctum, a decidir).
- [ ] Endpoints: registro, login, refresh, logout.
- [ ] Middleware de autenticação na API.
- [ ] Policies base (estrutura, sem regras finais ainda).
- [ ] Telas de login/registro no Next.js (pt-BR), integração com API.
- [ ] Context/hook de autenticação no frontend (`AuthContext`, `useAuth`).

**Entregável:** login funcional ponta a ponta, com JWT emitido pelo Laravel e consumido pelo Next.js.

---

## Sprint 3 — Integração com Mercado Livre (OAuth)

- [ ] **Ação sua:** criar aplicação no DevCenter do Mercado Livre e me fornecer Client ID/Secret via `.env` (nunca commitar). Configuração conforme RESUMO.md:
  - Tipo de aplicação: **Web**, nome sugerido "NoOEM Flow".
  - Ativar **PKCE**, desativar **Device Grant**.
  - Redirect URI de dev: `http://nooemflow.local/auth/mercadolivre/callback` (ajustar se o domínio local definitivo for outro — ver Pré-requisito 5; produção exige HTTPS).
- [ ] Configurar `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `MERCADOLIVRE_REDIRECT_URI` no `.env`.
- [ ] Implementar `MercadoLivreService`: fluxo OAuth2 + PKCE, troca de code por token.
- [ ] Rota de callback `/auth/mercadolivre/callback`.
- [ ] Persistir tokens (access/refresh) vinculados à `Account`.
- [ ] Tela no frontend para "Conectar conta Mercado Livre".
- [ ] Testar fluxo completo em ambiente de desenvolvimento (`http://<dominio>.local/...`).

**Entregável:** usuário consegue conectar uma conta do Mercado Livre via OAuth e o token fica salvo.

---

## Sprint 4 — Sincronização de Dados

- [ ] Migrations: `products`, `orders`, `payments`, `messages`.
- [ ] `RefreshTokenJob` (renovação automática de token).
- [ ] `SyncProductsJob`, `SyncOrdersJob`, `SyncPaymentsJob`, `SyncMessagesJob`.
- [ ] Configurar Laravel Queue (driver: database, ou Redis se disponível).
- [ ] Configurar Scheduler (Laravel Task Scheduling) — no XAMPP isso normalmente requer Cron/Task Scheduler do Windows apontando para `artisan schedule:run`.
- [ ] `CleanupJob` (rotina de limpeza de dados obsoletos/staging).
- [ ] Logs de sincronização e tratamento de falhas/retentativas.

**Entregável:** dados de produtos/pedidos/pagamentos/mensagens sincronizando automaticamente do Mercado Livre para o MySQL local.

---

## Sprint 5 — Dashboard

- [ ] Endpoints agregados de KPIs (Receita, Pedidos, Produtos, Financeiro, Pagamentos, Mensagens, Alertas).
- [ ] Camada de cache para consultas pesadas do dashboard.
- [ ] Componentes de dashboard no Next.js (cards de KPI, gráficos).
- [ ] Seleção de conta ativa (multi-account por usuário).
- [ ] Atualização em tempo real ou near-real-time (polling ou websockets — **a decidir com você**).

**Entregável:** dashboard funcional exibindo KPIs reais da conta conectada.

---

## Sprint 6 — Gestão de Vendas (Pedidos/Produtos)

- [ ] CRUD e listagem de produtos com filtros/paginação.
- [ ] Listagem e detalhe de pedidos, com status e fila de processamento.
- [ ] Ações sobre pedidos (ex.: marcar como processado, exportar).
- [ ] Telas Next.js correspondentes (pt-BR).

**Entregável:** módulos de Produtos e Pedidos utilizáveis end-to-end.

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
