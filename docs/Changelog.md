# Changelog

Resumo por sprint. Detalhamento completo, com evidência de validação de cada item, em `PLAN.md` (raiz do projeto).

## Sprint 1 — Setup
Ambiente XAMPP (Apache/PHP/MySQL), scaffold Laravel 12 (backend) e Next.js 16 (frontend), estrutura de pastas inicial.

## Sprint 2 — Usuários e Autenticação
Cadastro/login com JWT (`tymon/jwt-auth`), guard `api` stateless, telas de login/registro no Next.js, `AuthContext`/`useAuth`. Extra: login com Google (Google Identity Services + verificação de ID token no backend).

## Sprint 3 — Integração com Mercado Livre (OAuth)
Fluxo OAuth2 + PKCE completo, VirtualHost HTTPS necessário pro callback, persistência de tokens criptografados por `Account`.

## Sprint 4 — Sincronização
Jobs de sync (produtos, pedidos, pagamentos, mensagens), scheduler + queue worker rodando via Windows Task Scheduler, renovação automática de token do Mercado Livre.

## Sprint 5 — Dashboard
KPIs agregados, alertas (token expirando/expirado, sync falhando), filtro de período. Padrão de UX "conteúdo borrado + botão Atualizar" pra token expirado, reaproveitado depois no Sprint 7 pra sessão do próprio app.

## Sprint 6 — Gestão de Vendas (Pedidos/Produtos)
Listagem de produtos e pedidos com filtros/paginação, marcar pedido como processado, exportar CSV. Extras: itens do pedido (produto/SKU/quantidade) e endereço do comprador na listagem e no detalhe, filtros estilo Excel (qualquer coluna, incluindo ordenação por cabeçalho e seleção múltipla exata de SKU), horário de exibição sempre em Brasília (independente do fuso da máquina de quem está olhando).

## Sprint 7 — Financeiro
Extrato de pagamentos, conciliação, resumo financeiro. Extras: data de liberação do dinheiro (pedidos/pagamentos), sessão do app com aviso de expiração gradual (em vez de logout abrupto), composer.json na raiz pra subir o app inteiro com um comando, correção de condição de corrida no login (token velho em voo derrubando sessão nova).

## Sprint 8 — Mensagens
Central de mensagens: importação/listagem de conversas (agrupadas por pedido/pack), interface de resposta, notificações de não lidas (badge no menu + alerta clicável no dashboard).

## Sprint 9 — Funcionários e Permissões
RBAC completo: funcionário (`user_partner`) é um `User` de verdade, acesso concedido por conta via pivot `account_user` com permissões granulares (módulo × ação: ver/gerenciar). Substituição do scaffold antigo sem login. Auditoria de ações. Telas de gestão de funcionários e permissões; `NavBar` reflete o que o usuário logado pode ver.

## Sprint 10 — Testes e Deploy
Testes automatizados (PHPUnit no backend cobrindo auth/RBAC/funcionários/sync; Jest+RTL no frontend cobrindo lógica de sessão e componentes-chave). Revisão de segurança: rate limiting (login/registro sem nenhum limite antes — corrigido), validação de input e proteção de rotas revisadas. Documentação completa em `docs/`. Decisão de deploy XAMPP-like (VPS tradicional, sem containerização).
