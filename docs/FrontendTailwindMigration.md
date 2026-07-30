# Plano de Execução — Migração do visual para Tailwind CSS (TailAdmin)

> Acompanhamento desta migração, no mesmo formato de `PLAN.md` (checkboxes conforme o trabalho avança). Ver também `PLAN_FRONT.md` (raiz do projeto) — mesmo conteúdo, formato "sprint" espelhando o `PLAN.md` principal.

## Contexto e decisão

Pedido original: trocar o frontend pelo template `Drlaravel/tailwind-dashboard-fa`. Investigado o repositório (via API do GitHub, não só a descrição): é o **TailAdmin Free**, um kit puramente visual — ~45 páginas HTML estáticas, Tailwind CSS v3 + Alpine.js (interatividade) + ApexCharts (gráficos) + Webpack, sem nenhuma integração com API.

**Decidido com você:** manter Next.js 16 / React 19 / TypeScript e toda a lógica já construída em 10 sprints (JWT, expiração/renovação de sessão, RBAC refletido na UI, hooks compartilhados) — adotar **só o visual** (paleta de cores, tipografia, layout de sidebar+header, padrões de card/tabela/formulário do TailAdmin), migrando de CSS Modules pra Tailwind CSS. Interatividade que no template é Alpine.js vira `useState`/handlers React (não instalar Alpine — conflitaria com o React).

**Tailwind v4** (não v3, que é o que o template usa) — v4 é a versão atual; paleta/espaçamento do template são portáveis sem perda.

**Dark mode**: botão de alternância manual claro/escuro (como no template), com persistência em `localStorage`. Enquanto o usuário não escolher, respeita `prefers-color-scheme`.

**Cores em `colors.css`, chamadas por variáveis**: a paleta nova fica inteira dentro de `frontend/src/styles/colors.css`, como variáveis CSS (`@theme` do Tailwind v4) — nenhuma cor hardcoded fora desse arquivo.

**Gráficos (ApexCharts) e mapa (JSVectorMap)**: no escopo (Sprint 2 do `PLAN_FRONT.md`) — precisam de dado novo do backend (série diária de receita, contagem de pedidos por estado), não é reskin puro.

Paleta de referência do TailAdmin (`tailwind.config.js` do template) a portar pro `@theme` do Tailwind v4:

```
primary #3C50E0 · secondary #80CAEE
black #1C2434 · black-2 #010101 · body #64748B · bodydark #AEB7C0 · bodydark1 #DEE4EE · bodydark2 #8A99AF
stroke #E2E8F0 · gray #EFF4FB · graydark #333A48 · gray-2 #F7F9FC · gray-3 #FAFAFA · whiten #F1F5F9 · whiter #F5F7FD
boxdark #24303F · boxdark-2 #1A222C · strokedark #2E3A47 · form-strokedark #3d4d60 · form-input #1d2a39
meta-1..9 (vermelho #DC3545, verde #10B981, azul #259AE6, amarelo #FFBA00, etc. — ver tailwind.config.js do template)
success #219653 · danger #D34053 · warning #FFA70B
title-xxl..title-xsm (escala tipográfica de títulos, 18px a 44px)
```

## Fase 0 — Fundação (bloqueia as demais fases)

- [X] Instalar Tailwind CSS v4 (`tailwindcss` + `@tailwindcss/postcss`) no frontend.
- [X] Configurar `postcss.config.mjs` e importar Tailwind em `frontend/src/app/globals.css` (`@import "tailwindcss"`), incluindo `@custom-variant dark (&:where(.dark, .dark *))` pra alternância manual por classe (em vez do padrão `prefers-color-scheme` do v4).
- [X] Portar a paleta de cores e a escala tipográfica do TailAdmin pro `@theme` do Tailwind v4 **dentro de** `frontend/src/styles/colors.css`. As 9 variáveis antigas (`--colorNN`) foram mantidas no mesmo arquivo por enquanto — ainda usadas pelas telas não migradas — remoção fica pra Fase 4 (Limpeza).
- [X] Criar `frontend/src/components/layout/Sidebar.tsx` — recriado com a paleta/classes do TailAdmin (`bg-black dark:bg-boxdark`, `text-bodydark1`, `hover:bg-graydark dark:hover:bg-meta-4`), 6 itens reais do Scrap Dash (Dashboard, Produtos, Pedidos, Financeiro, Mensagens, Funcionários) — sem itens de demonstração. Badge de não lidas (`useConversations`) mantido. Links de módulo escondidos conforme `account.permissions`.
- [X] Criar `frontend/src/components/layout/Header.tsx` — barra fixa (`sticky`, `bg-white dark:bg-boxdark`), hamburger (`useState`), alternância claro/escuro (sol/lua), dropdown de usuário (nome/e-mail/Sair, `logout()` do `AuthContext`). Sem notificação/chat/busca fake.
- [X] Alternância de tema: `frontend/src/hooks/useTheme.ts` (`useState` + `localStorage`), aplica/remove `dark` na tag `<html>`. Respeita `prefers-color-scheme` até o usuário escolher; depois fica fixo na preferência salva. Script inline no `layout.tsx` raiz evita flash claro→escuro no carregamento.
- [X] Criar `frontend/src/app/(app)/layout.tsx` — route group com `Sidebar` + `Header` + `SessionGuard`, absorvendo o redirect de "não autenticado" hoje antes duplicado em cada página.
- [X] Mover `dashboard/`, `products/`, `orders/`, `orders/[id]/`, `financial/`, `messages/`, `employees/` pra dentro de `app/(app)/`. Além da reorganização de pasta, também foi removido o `NavBar`/`SessionGuard`/redirect duplicado de cada página (a shell nova já cobre isso, senão ficaria duplicado); o conteúdo interno de cada página continua com o CSS Module antigo até as fases seguintes tocarem nela.
- [X] Reskin de `/login` e `/register` — card dividido (ilustração + formulário, ilustração escondida abaixo de `xl`), standalone, reaproveitando `useAuth().login/register` e `GoogleSignInButton`.
- [X] Branding: "Scrap Dash" (marca "SD" + nome) no lugar do logo do TailAdmin — sidebar, login, register.
- [X] Verificar: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` limpos.
- [ ] **Ponto de checagem**: parar aqui e confirmar com você que a direção visual (sidebar, paleta, tela de login, claro/escuro) está de acordo antes de reskinar as demais telas. **Ainda não validado visualmente em navegador** (sem ferramenta de screenshot nesta sessão) — só conferido via HTML/CSS renderizado (`curl`) no dev server.

## Fase 1 — Dashboard (KPIs, Gráficos e Mapa)

Separada das demais telas de dados porque envolve trabalho novo de verdade (não só reskin) e um risco técnico a validar cedo (mapa).

- [X] **Backend:** novo endpoint `GET /accounts/{account}/dashboard/revenue-series` — receita diária (pedidos pagos); sem período, últimos 30 dias. Testado com dados reais.
- [X] **Backend:** novo endpoint `GET /accounts/{account}/dashboard/customers-by-state` — contagem de pedidos agrupados por `orders.buyer_state`. Testado com dados reais (24 estados).
- [X] 4 testes automatizados novos (`DashboardControllerTest`); suíte completa do backend 26/26.
- [X] Instalar `apexcharts` + `react-apexcharts`.
- [X] **`jsvectormap` — risco confirmado**: só traz mapa mundial, sem dado de estados do Brasil, sem pacote de mapa BR compatível encontrado. Trocado por `@svg-maps/brazil` (paths SVG por estado, zero dependências) + componente React nativo (`BrazilMap.tsx`) com choropleth por opacidade — mais robusto pro React 19 que integrar uma lib imperativa via `useRef`. Utilitário `utils/brazilStates.ts` converte nome completo do estado (formato que o Mercado Livre devolve) pra sigla; validado contra os 24 estados reais da conta de teste, 100% de acerto.
- [X] Dashboard — cards de KPI reskinados (componentes compartilhados com o Financeiro, que herda o visual novo antecipadamente).
- [X] Dashboard — gráfico de receita (área, ApexCharts) usando o endpoint novo.
- [X] Dashboard — donuts de pedidos por status e pagamentos por status.
- [X] Dashboard — mapa de distribuição de clientes por estado.
- [X] Verificar: `tsc`/`lint`/`test`/`build` limpos (frontend e backend). **QA manual no navegador ainda não feito** (sem ferramenta de screenshot nesta sessão) — validado via `curl` autenticado contra os endpoints e o dev server com dados reais.

## Fase 2 — Produtos, Pedidos e Financeiro

- [X] Produtos/Pedidos/Financeiro — tabelas reskinadas no padrão TailAdmin, reaproveitando paginação, filtros e ordenação por coluna já existentes.
- [X] Detalhe do pedido (`orders/[id]`) — cards + tabelas de itens/pagamentos no mesmo padrão.
- [X] Novo `StatusBadge` compartilhado (cor semântica por status) e `Pagination` reskinado.
- [X] Verificar: `tsc`/`lint`/`test`/`build` limpos. **QA manual no navegador ainda não feito** (sem ferramenta de screenshot nesta sessão) — validado via `curl` contra o dev server (rotas respondendo 200, classes novas compiladas no CSS) com dados reais.

## Fase 3 — Telas restantes

- [X] Mensagens — layout de duas colunas reskinado (sem equivalente 1:1 no template), lógica intacta.
- [X] Funcionários — formulário, cards e `PermissionGrid` reskinados, preservando a estrutura testada por `PermissionGrid.test.tsx`.
- [X] Verificar: `tsc`/`lint`/`test`/`build` limpos. **QA manual no navegador ainda não feito** (sem ferramenta de screenshot nesta sessão) — validado via `curl` contra o dev server com dados reais.

## Fase 4 — Limpeza e verificação final

- [X] Removidos todos os `.module.css` (`auth`, `dashboard`, `list`, `session`, `messages`, `nav`, `employees`) e `NavBar.tsx` (morto desde a Fase 0). Precisou terminar de reskinar dashboard (casca), `SessionGuard` e a landing `/`, que ainda não tinham sido tocados em nenhuma fase anterior. `colors.css` ficou só com a paleta TailAdmin.
- [X] `docs/Arquitetura.md` atualizado. Menções ao `NavBar` corrigidas pra `Sidebar` em `CasosDeUso.md`/`Fluxos.md`/`Permissoes.md`.
- [X] Suíte completa limpa; `PermissionGrid.test.tsx` não precisou de ajuste.
- [X] QA via `curl`: as 10 rotas respondendo 200 com dados reais, paleta nova compilando, nenhum `--colorNN` antigo sobrando. **QA em navegador de verdade ainda pendente** (sem ferramenta de screenshot em nenhuma sprint desta sessão).

**Entregável:** frontend com o mesmo comportamento/funcionalidade de hoje (mais gráficos/mapa no dashboard), visual TailAdmin (Tailwind CSS) em vez de CSS Modules, responsivo.
