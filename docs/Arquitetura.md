# Arquitetura

## Visão geral

Scrap Dash é uma aplicação de duas camadas desacopladas, comunicando-se por uma API REST em JSON:

```
┌─────────────────────┐        HTTPS/JSON        ┌──────────────────────┐        HTTPS       ┌──────────────────┐
│  Frontend (Next.js)  │ ───────────────────────► │  Backend (Laravel)   │ ──────────────────► │  Mercado Livre    │
│  React 19, App Router│ ◄─────────────────────── │  API stateless (JWT) │ ◄────────────────── │  API + OAuth2     │
└─────────────────────┘                           └──────────┬───────────┘                     └───────────────────┘
                                                                │
                                                       ┌────────▼────────┐
                                                       │  MySQL/MariaDB   │
                                                       └──────────────────┘
                                                                │
                                                    fila (QUEUE_CONNECTION=database)
                                                                │
                                                       ┌────────▼────────┐
                                                       │  Scheduler +     │
                                                       │  Queue Worker    │
                                                       │  (Windows Task   │
                                                       │  Scheduler local)│
                                                       └──────────────────┘
```

- **Backend**: Laravel 12 (PHP 8.2), API-only (sem sessões/Blade nas rotas de negócio), autenticação stateless via JWT (`tymon/jwt-auth`).
- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 (paleta/tipografia TailAdmin). Sem SSR autenticado — todas as telas protegidas buscam dados client-side depois do JWT carregar.
- **Banco**: MySQL/MariaDB (via XAMPP em dev). Testes automatizados usam SQLite em memória.
- **Integrações externas**: Mercado Livre (OAuth2 + PKCE, API de itens/pedidos/pagamentos/mensagens) e Google Identity Services (login social).

## Backend — organização de pastas

```
backend/app/
├── Http/
│   ├── Controllers/        # um controller por recurso (Order, Product, Payment, Message, Employee, ...)
│   ├── Requests/           # FormRequests só para os fluxos de auth (register/login/google)
│   └── Resources/          # serialização de resposta (JsonResource) — nunca expõe atributos sensíveis
├── Models/                 # Eloquent — User, Account, Order, OrderItem, Payment, Product, Message, AuditLog, AccountUser (pivot)
├── Jobs/                   # sincronização assíncrona com o Mercado Livre (ver Fluxos.md)
├── Policies/                # AccountPolicy concentra toda a autorização (ver Permissoes.md)
├── Application/Services/    # DashboardService, AuditLogger — lógica de aplicação que não é "modelo" nem "controller"
└── Infrastructure/
    ├── MercadoLivre/        # MercadoLivreService — todo o HTTP client pro Mercado Livre vive aqui
    └── Google/               # GoogleAuthService — verificação de ID token do Google
```

`Application/Actions`, `Application/DTO`, `Infrastructure/Cache`, `Infrastructure/Queue` e `Infrastructure/Repositories` existem como pastas placeholder (do desenho inicial do projeto) mas ainda não têm nenhuma classe — o projeto não precisou dessas camadas até agora; a lógica de negócio mora nos Models, Jobs e nesses dois Services. Não force uma classe nelas só para "preencher a arquitetura" — só crie quando a necessidade real aparecer.

## Por que stateless (JWT) em vez de sessão

A API não guarda estado de sessão no servidor. Cada requisição autenticada carrega um Bearer token (JWT) assinado pelo backend. Isso permite:
- Escalar o backend horizontalmente sem sticky sessions.
- O frontend (SPA) e futuros clientes (mobile, no roadmap) consumirem a mesma API sem cookies/CSRF.

O preço disso é ter que resolver expiração/renovação de token no cliente — ver `Fluxos.md#sessão-e-expiração-de-token`.

## Sincronização com o Mercado Livre

Não há webhooks configurados — a sincronização é por polling. Um scheduler (`routes/console.php`) dispara jobs em intervalos fixos, que são processados por um worker de fila. Em desenvolvimento isso roda via `composer dev` (raiz do projeto) ou, persistentemente, via duas tarefas do Windows Task Scheduler (`scripts/INSTRUCOES_SCHEDULER.md`). Detalhes de cada job em `Fluxos.md`.

## Frontend — organização de pastas

```
frontend/src/
├── app/
│   ├── (app)/           # route group das telas autenticadas (dashboard, orders, products, financial, messages, employees) — layout.tsx aqui monta Sidebar + Header + SessionGuard e centraliza o redirect de "não autenticado"
│   ├── login/, register/ # telas públicas, standalone (sem Sidebar/Header)
│   └── page.tsx          # landing "/", redireciona pro dashboard se já autenticado
├── components/          # componentes reutilizáveis, agrupados por domínio (dashboard/, auth/, employees/, layout/, shared/)
├── contexts/            # AuthContext (única fonte de verdade do usuário logado/token)
├── hooks/               # useAuth, useAccounts, useDashboard, useRevenueSeries, useCustomersByState, useConversations, useTokenExpiry, useTheme
├── services/            # uma função por chamada de API (orders.ts, products.ts, employees.ts, ...) — todas passam por apiFetch (services/api.ts)
├── types/               # tipos TypeScript espelhando os JsonResource do backend
├── utils/               # format.ts (datas/fuso), brazilStates.ts (nome do estado → sigla, usado pelo mapa do dashboard)
└── styles/              # colors.css — paleta TailAdmin inteira via @theme do Tailwind v4 (cada --color-* é ao mesmo tempo classe utilitária e variável CSS); não há mais CSS Modules por tela, todo o visual é Tailwind
```

Não há gerenciador de estado global (Redux/Zustand) — `AuthContext` cobre autenticação, e cada página busca seus próprios dados via hooks locais. Isso é intencional: o app não tem estado compartilhado complexo o suficiente pra justificar uma lib de estado.

Tema claro/escuro é manual (`useTheme`, persistido em `localStorage`, classe `dark` na tag `<html>`), com fallback pra `prefers-color-scheme` até o usuário escolher — ver `PLAN_FRONT.md` pra decisões de migração do visual.

## Autorização

Autorização é decidida inteiramente pelo backend (`AccountPolicy` + `User::canAccessAccountModule()`) — o frontend só *reflete* isso (esconder links/telas que o usuário não pode ver), nunca decide sozinho. Ver `Permissoes.md`.
