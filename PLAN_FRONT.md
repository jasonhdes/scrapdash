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

- [X] **Backend:** novo endpoint `GET /accounts/{account}/dashboard/revenue-series` — receita diária (pedidos pagos) dentro do período; sem período informado, últimos 30 dias (all-time não cabe num gráfico legível). Testado com dados reais da conta 4 (30 dias, valores batendo).
- [X] **Backend:** novo endpoint `GET /accounts/{account}/dashboard/customers-by-state` — contagem de pedidos agrupados por `orders.buyer_state`, ignorando pedidos com endereço ainda não sincronizado. Testado com dados reais (24 estados distintos retornados).
- [X] 4 testes automatizados novos (`DashboardControllerTest`) cobrindo série com gaps preenchidos, período explícito, agrupamento por estado e autorização (`403` pra quem não é dono da conta). Suíte completa do backend: 26/26 passando.
- [X] Instalar `apexcharts` + `react-apexcharts` (wrapper oficial React).
- [X] **Mapa — risco do plano se confirmou**: `jsvectormap` só traz o mapa mundial (`world.js`/`world-merc.js`), nenhum dado de estados do Brasil embutido, e não achei pacote de mapa do Brasil compatível com essa lib especificamente. **Decisão:** troquei por `@svg-maps/brazil` (dataset de paths SVG por estado, sem jQuery, sem dependência nenhuma) + um componente React nativo (`BrazilMap.tsx`) que colore cada estado por intensidade (opacidade) proporcional ao total de pedidos — mais simples, mais robusto pro React 19 e sem gambiarra de `useRef`/lib imperativa. `jsvectormap` foi desinstalado. Precisou de um utilitário (`utils/brazilStates.ts`) pra converter o nome completo do estado que o Mercado Livre devolve (ex. "São Paulo") pra sigla (ex. "sp") — validado contra os 24 estados reais retornados pela conta de teste, 100% de acerto.
- [X] Dashboard — cards de KPI reskinados (`KpiCard.tsx`, `AccountSelector.tsx`, `DateRangeFilter.tsx` — componentes compartilhados, então o Financeiro também herda esse visual antes da Sprint 3 chegar lá).
- [X] Dashboard — gráfico de receita ao longo do período (área, ApexCharts), usando o endpoint novo de série diária.
- [X] Dashboard — donuts de pedidos por status e pagamentos por status (dado que já existia, sem endpoint novo).
- [X] Dashboard — mapa de distribuição de clientes por estado (ver decisão acima).
- [X] Alertas continuam como banner (sem mudança de comportamento, só visual).

**Entregável:** dashboard com gráficos e mapa reais, dados de produção (conta 4). `tsc`/`lint`/`test`/`build` limpos (frontend e backend) — validado via `curl` autenticado contra os endpoints novos e contra o dev server, não em navegador real (sem ferramenta de screenshot nesta sessão). Peço que você confira visualmente antes de eu seguir pra Sprint 3.

---

## Sprint 3 — Produtos, Pedidos e Financeiro

- [X] Produtos/Pedidos/Financeiro — tabelas reskinadas no padrão TailAdmin (`bg-gray-2`/`bg-meta-4` no cabeçalho, `border-stroke`/`strokedark` nas linhas), reaproveitando paginação, filtros e ordenação por coluna já existentes (só a casca visual mudou, a lógica de cada página ficou intacta).
- [X] Detalhe do pedido (`orders/[id]`) — cards + tabelas de itens/pagamentos no mesmo padrão.
- [X] Novo componente `StatusBadge` (compartilhado) — cor semântica por status (verde pra pago/aprovado/ativo, amarelo pra pendente/em revisão, vermelho pra cancelado/rejeitado, azul pra reembolsado), usado em Produtos, Pedidos, Financeiro e no detalhe do pedido.
- [X] `Pagination` (compartilhado) reskinado.

**Entregável:** produtos, pedidos (lista e detalhe) e financeiro com o visual novo, mesma funcionalidade de hoje. `tsc`/`lint`/`test`/`build` limpos (18/18 testes). Confirmado que as 4 rotas respondem `200` e que as classes novas (`bg-success`, `text-danger` etc.) compilam no CSS, via `curl` contra o dev server com dados reais — **não validado num navegador de verdade** (sem ferramenta de screenshot nesta sessão). Peço que você confira visualmente antes de eu seguir pra Sprint 4.

---

## Sprint 4 — Telas Restantes

- [X] Mensagens — layout de duas colunas (lista de conversas + thread) reskinado no padrão TailAdmin (sem equivalente 1:1 no template, adaptado do zero): lista com hover/estado ativo, bolhas de mensagem enviada/recebida com cores diferentes, formulário de resposta fixo embaixo. Lógica (polling de conversas, envio de resposta, badge de não lida) intacta.
- [X] Funcionários — formulário de criação e cards de funcionário reskinados; `PermissionGrid` reskinado preservando a mesma estrutura de tabela (`role="row"`, ordem dos checkboxes) pra não quebrar `PermissionGrid.test.tsx`.

**Entregável:** todas as telas autenticadas no visual novo — fim do reskin de tela por tela do `PLAN_FRONT.md`. `tsc`/`lint`/`test`/`build` limpos (18/18 testes, incluindo `PermissionGrid.test.tsx` sem alterações). Confirmado `/messages` e `/employees` respondendo `200` e as classes novas compiladas no CSS via `curl` contra o dev server — **não validado num navegador de verdade** (sem ferramenta de screenshot nesta sessão). Peço que você confira visualmente antes de eu seguir pra Sprint 5 (limpeza final).

---

## Sprint 5 — Limpeza e Verificação Final

- [X] Removidos todos os `.module.css` (`auth`, `dashboard`, `list`, `session`, `messages`, `nav`, `employees`) e o `NavBar.tsx` (morto desde a Sprint 1 — substituído pelo `Sidebar`). Isso exigiu terminar de reskinar 3 pontos que ainda dependiam deles e não estavam explicitamente em nenhuma sprint anterior: o dashboard (só a casca — header/KPI grid/alertas — continuava em CSS Module; os gráficos da Sprint 2 já eram Tailwind), o `SessionGuard` (alerta de sessão expirando/expirada, aparece em toda tela autenticada) e a landing `/` (pré-login). `colors.css` ficou só com a paleta TailAdmin; as 9 variáveis antigas (`--colorNN`) saíram, e `globals.css` passou a usar a paleta nova (`--color-whiten`/`--color-boxdark-2`) pro fundo do `<body>`, também pela classe `.dark` em vez de `prefers-color-scheme`.
- [X] Atualizado `docs/Arquitetura.md` ("Frontend — organização de pastas": Tailwind no lugar de CSS Modules, route group `(app)/`, pastas `utils/`/hooks novos). Também corrigidas menções ao `NavBar` (componente removido) em `CasosDeUso.md`, `Fluxos.md` e `Permissoes.md` pra `Sidebar` — `Changelog.md` não foi tocado por ser registro histórico.
- [X] Suíte completa (`tsc`, `lint`, `test`, `build`) limpa — `PermissionGrid.test.tsx` não precisou de nenhum ajuste (a estrutura de tabela/`role="row"`/ordem dos checkboxes foi preservada de propósito nos reskins).
- [X] QA final: todas as 10 rotas (`/`, `/login`, `/register`, `/dashboard`, `/products`, `/orders`, `/orders/[id]`, `/financial`, `/messages`, `/employees`) respondendo `200` contra o dev server com dados reais; confirmado que a paleta nova compila no CSS e que nenhum `--colorNN` antigo sobrou no bundle. **Não validado num navegador de verdade** (sem ferramenta de screenshot nesta sessão, em nenhuma das 5 sprints) — claro/escuro e larguras mobile continuam pendentes da sua conferência visual.

**Entregável:** frontend com o mesmo comportamento/funcionalidade de antes (mais gráficos/mapa no dashboard), visual TailAdmin (Tailwind CSS) em vez de CSS Modules, responsivo, sem CSS morto sobrando. Migração `PLAN_FRONT.md` concluída — falta só a sua validação visual (em especial claro/escuro e mobile, que eu não consegui testar diretamente).

---

## Como vamos trabalhar

- Eu (equipe de execução) proponho e implemento sprint a sprint, sempre relatando o que foi entregue e testado.
- Cada sprint é validada no navegador (claro/escuro) antes de eu considerar concluída.
- Ao final de cada sprint, reviso o entregável com você antes de avançar para a próxima — evita reskinar tudo de uma vez e só depois descobrir que algo não bateu com o esperado.

**Próximo passo sugerido:** concluir a Sprint 1 (fundação) e parar no ponto de checagem antes de seguir.
