# Plano de Execução – Frontend Tailwind (Scrap Dash)

> Migração do **visual** do frontend do Scrap Dash para Tailwind CSS, inspirado no template [TailAdmin Free](https://github.com/Drlaravel/tailwind-dashboard-fa) — mantendo Next.js 16 / React 19 / TypeScript e toda a lógica já construída ao longo do [PLAN.md](PLAN.md) (10 sprints: auth JWT, integração Mercado Livre, sincronização, permissões, etc.). Este documento é complementar ao `PLAN.md`, mesmo padrão de sprints/checkboxes.

## Papéis

- **Engenheiro/Idealizador (você):** define prioridades, valida decisões de visual/produto, aprova cada sprint antes da próxima começar.
- **Equipe de execução (Claude):** implementa o reskin sprint a sprint, reportando o que foi feito e testado (navegador, claro/escuro, `tsc`/`lint`/`test`/`build`).

## Contexto e decisões já tomadas

O pedido original era trocar o frontend pelo template `Drlaravel/tailwind-dashboard-fa`. Investigando o repositório (via API do GitHub, não só a descrição): é o **TailAdmin Free** — um kit puramente visual (~45 páginas HTML estáticas, Tailwind CSS v3 + Alpine.js + ApexCharts + Webpack, sem integração com API nenhuma).

**Decidido com você antes de começar:**
- Manter Next.js/React/TypeScript e toda a lógica existente (JWT, expiração/renovação de sessão, RBAC refletido na UI, hooks compartilhados) — **não** é uma reescrita em HTML estático.
- Adotar **Tailwind CSS v4** (não v3, que é o que o template usa — v4 é a versão atual, paleta/espaçamento do template são portáveis sem perda).
- Interatividade que no template é Alpine.js (dropdowns, toggle de sidebar) vira `useState`/handlers React — não instalar Alpine.js.
- **Dark mode**: botão de alternância manual claro/escuro (como no template), com persistência em `localStorage`. Enquanto o usuário não escolher, respeita `prefers-color-scheme`.
- **Cores em `colors.css`, chamadas por variáveis**: a paleta nova (TailAdmin) fica definida inteira dentro de `frontend/src/styles/colors.css`, como variáveis CSS (`@theme` do Tailwind v4, que expõe cada cor como variável de verdade, ex. `--color-primary`) — nenhuma cor hardcoded direto em componente ou em outro arquivo. Mesma convenção já usada no projeto (`--colorNN` antes desta migração), só que com a paleta mais rica do template.
- **Gráficos (ApexCharts) e mapa (JSVectorMap) no dashboard**: entram no escopo (Sprint 2) — não é só reskin puro, precisa de dado novo do backend (ver Sprint 2).

Plano detalhado de exploração/decisão em `docs/FrontendTailwindMigration.md`.

## Paleta de referência (TailAdmin)

```
primary #3C50E0 · secondary #80CAEE
black #1C2434 · black-2 #010101 · body #64748B · bodydark #AEB7C0 · bodydark1 #DEE4EE · bodydark2 #8A99AF
stroke #E2E8F0 · gray #EFF4FB · graydark #333A48 · gray-2 #F7F9FC · gray-3 #FAFAFA · whiten #F1F5F9 · whiter #F5F7FD
boxdark #24303F · boxdark-2 #1A222C · strokedark #2E3A47 · form-strokedark #3d4d60 · form-input #1d2a39
meta-1..9 (vermelho #DC3545, verde #10B981, azul #259AE6, amarelo #FFBA00, etc.)
success #219653 · danger #D34053 · warning #FFA70B
title-xxl..title-xsm (escala tipográfica de títulos, 18px a 44px)
```

---

## Sprint 1 — Fundação (Tailwind + Shell)

- [X] Instalar Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/postcss`) no frontend.
- [X] Configurar `postcss.config.mjs` e importar Tailwind em `frontend/src/app/globals.css` (`@import "tailwindcss"`) — inclui `@custom-variant dark (&:where(.dark, .dark *))` pra alternância manual por classe.
- [X] Portar a paleta de cores e a escala tipográfica do TailAdmin pro `@theme` do Tailwind v4 **dentro de** `frontend/src/styles/colors.css` — paleta nova adicionada; as 9 variáveis antigas (`--colorNN`) ficaram junto por enquanto (ainda usadas pelas telas não migradas), remoção na Sprint 5.
- [X] `frontend/src/components/layout/Sidebar.tsx` — recriado com a paleta/classes do TailAdmin (`bg-black dark:bg-boxdark`, `text-bodydark1`, `hover:bg-graydark dark:hover:bg-meta-4`), 6 itens reais do Scrap Dash, badge de mensagens não lidas (`useConversations`) mantido, links de módulo escondidos conforme `account.permissions`.
- [X] `frontend/src/components/layout/Header.tsx` — barra superior fixa, hamburger, alternância claro/escuro (sol/lua), dropdown de usuário (nome/e-mail/Sair). Sem notificação/chat/busca fake.
- [X] Alternância de tema (`frontend/src/hooks/useTheme.ts`, `useState` + `localStorage`) — aplica/remove `dark` na tag `<html>`; respeita `prefers-color-scheme` até o usuário escolher. Script inline no `layout.tsx` raiz evita flash claro→escuro no load.
- [X] `frontend/src/app/(app)/layout.tsx` — route group com `Sidebar` + `Header` + `SessionGuard`, redirect de "não autenticado" centralizado.
- [X] Mover `dashboard/`, `products/`, `orders/`, `orders/[id]/`, `financial/`, `messages/`, `employees/` pra dentro de `app/(app)/` — além da reorganização, o `NavBar`/`SessionGuard`/redirect duplicados de cada página foram removidos (a nova shell já cobre isso); o miolo de cada tela continua com o CSS Module antigo, a mover na Sprint 2/3/4.
- [X] Reskin de `/login` e `/register` — card dividido (ilustração + formulário, ilustração escondida abaixo de `xl`), standalone, reaproveitando `useAuth().login/register` e `GoogleSignInButton`.
- [X] Branding: "Scrap Dash" (marca "SD" + nome) no lugar do logo do TailAdmin — sidebar, login e register.

**Entregável:** fundação Tailwind no ar — shell (sidebar+header) funcionando em volta das telas existentes (ainda com visual antigo por dentro) e `/login`/`/register` já 100% no novo visual. `tsc`/`lint`/`test`/`build` limpos (validado). **Não validado:** conferência visual em navegador real (sem ferramenta de screenshot disponível nesta sessão) — só verificado via HTML/CSS renderizados por `curl` no dev server. Peço que você confira visualmente antes de eu seguir pra Sprint 2.

**Ponto de checagem:** parar aqui e confirmar com você que a direção visual (sidebar, paleta, tela de login, claro/escuro) está de acordo antes de reskinar as demais telas.

---

## Sprint 2 — Dashboard (KPIs, Gráficos e Mapa)

Separada das demais telas de dados porque envolve trabalho novo de verdade (não só reskin) e um risco técnico a validar cedo (mapa).

- [ ] **Backend:** novo endpoint `GET /accounts/{account}/dashboard/revenue-series` — receita agregada por dia dentro do período filtrado. Hoje `DashboardService` só devolve o total somado do período; sem série diária não dá pra desenhar tendência nenhuma.
- [ ] **Backend:** novo endpoint `GET /accounts/{account}/dashboard/customers-by-state` — contagem de pedidos agrupados por `orders.buyer_state` (dado já sincronizado desde o Sprint 6 do `PLAN.md` via `SyncOrderAddressesJob`, só falta agregar por estado).
- [ ] Instalar `apexcharts` + `react-apexcharts` (wrapper oficial React — o template usa a lib vanilla via Alpine, aqui integra como componente de verdade).
- [ ] Instalar `jsvectormap` — **risco a validar antes de prometer prazo**: não existe wrapper React maduro/compatível com React 19 pra essa lib (vai precisar integrar a versão vanilla via `useRef`/`useEffect` direto, sem wrapper); confirmar se o pacote traz um mapa dos estados do Brasil pronto ou se precisa de um GeoJSON à parte antes de seguir.
- [ ] Dashboard — cards de KPI no estilo do template (`cards.html`).
- [ ] Dashboard — gráfico de receita ao longo do período (linha/área), usando o endpoint novo de série diária.
- [ ] Dashboard — gráficos de pizza/donut para pedidos por status e pagamentos por status (dado que já existe hoje — `orders.by_status`/`payments.by_status` —, sem endpoint novo).
- [ ] Dashboard — mapa de distribuição de clientes por estado, usando o endpoint novo.
- [ ] Alertas continuam como banner (sem mudança de comportamento, só visual).

**Entregável:** dashboard com gráficos e mapa reais, dados de produção. Validado no navegador (claro/escuro) com a conta real. `tsc`/`lint`/`test`/`build` limpos.

---

## Sprint 3 — Produtos, Pedidos e Financeiro

- [ ] Produtos/Pedidos/Financeiro — tabelas seguindo `tables.html`/`table-01.html`/`table-02.html` do template, reaproveitando paginação, filtros e ordenação por coluna já existentes (só troca a casca visual, não a lógica).
- [ ] Detalhe do pedido (`orders/[id]`) — cards + tabela de itens/pagamentos no mesmo padrão.

**Entregável:** produtos, pedidos (lista e detalhe) e financeiro com o visual novo, mesma funcionalidade de hoje. Validado no navegador (claro/escuro) com dados reais. `tsc`/`lint`/`test`/`build` limpos.

---

## Sprint 4 — Telas Restantes

- [ ] Mensagens — adaptar `inbox.html`/`messages.html` do template pro layout de duas colunas (lista de conversas + thread) já existente — maior esforço de adaptação desta sprint, sem equivalente 1:1 no template.
- [ ] Funcionários — grade de permissões construída a partir dos primitivos de formulário/tabela/badge do template (`form-elements.html`, `badge.html`) — sem equivalente direto no template.

**Entregável:** todas as telas autenticadas no visual novo. Validado no navegador (claro/escuro) com dados reais. `tsc`/`lint`/`test`/`build` limpos.

---

## Sprint 5 — Limpeza e Verificação Final

- [ ] Remover todos os `.module.css` não usados (`auth`, `dashboard`, `list`, `session`, `messages`, `nav`, `employees`) e o `colors.css` antigo.
- [ ] Atualizar `docs/Arquitetura.md` (seção "Frontend — organização de pastas") pra refletir Tailwind no lugar de CSS Modules.
- [ ] Rodar a suíte completa (`tsc`, `lint`, `test`, `build`) uma última vez; ajustar testes de componente que precisarem (mudança de markup pode afetar queries em `PermissionGrid.test.tsx` etc.).
- [ ] QA manual final: cada tela, claro e escuro, larguras mobile (ganho real sobre o layout atual, que não foi pensado pra mobile).

**Entregável:** frontend com o mesmo comportamento/funcionalidade de hoje (mais gráficos/mapa no dashboard), visual TailAdmin (Tailwind CSS) em vez de CSS Modules, responsivo, sem CSS morto sobrando.

---

## Como vamos trabalhar

- Eu (equipe de execução) proponho e implemento sprint a sprint, sempre relatando o que foi entregue e testado.
- Cada sprint é validada no navegador (claro/escuro) antes de eu considerar concluída.
- Ao final de cada sprint, reviso o entregável com você antes de avançar para a próxima — evita reskinar tudo de uma vez e só depois descobrir que algo não bateu com o esperado.

**Próximo passo sugerido:** concluir a Sprint 1 (fundação) e parar no ponto de checagem antes de seguir.
