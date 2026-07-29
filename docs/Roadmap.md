# Roadmap

## Concluído (Sprints 1–10)

Ver `docs/Changelog.md` para o resumo por sprint, e `PLAN.md` (raiz do projeto) para o detalhamento completo com evidências de validação de cada item.

## Lacunas conhecidas (não bloqueiam uso, mas valem registro)

- **Sem tela de administração pro `master`**: hoje o perfil master usa as mesmas telas do `user`, só sem a restrição de "só minhas contas" — não existe uma visão consolidada de "todos os usuários/contas do sistema" pensada especificamente pra esse perfil.
- **Sem backup de banco configurado**: nem em desenvolvimento, nem definido pra produção. Precisa de decisão + configuração antes de um go-live real com dados de clientes de verdade.
- **Vulnerabilidades de dependência conhecidas e não corrigidas** (`postcss`, `sharp`, herdadas do próprio Next.js 16.2.11, não introduzidas por este projeto): `npm audit` acusa 29 avisos de severidade alta. A correção automática sugerida (`npm audit fix --force`) rebaixaria o Next.js pra uma versão `9.x` — inaceitável. Ação correta é acompanhar releases do Next.js e atualizar quando uma versão corrigida (ainda na major 16) estiver disponível, não forçar o downgrade.
- **Cobertura de testes automatizados é dos fluxos críticos, não exaustiva**: auth, RBAC/permissões, CRUD de funcionários e um job de sincronização representativo (`SyncProductsJob`) estão cobertos; os outros 5 jobs de sync, o fluxo completo de OAuth do Mercado Livre (mock de HTTP) e a maior parte das telas do frontend ainda não têm teste automatizado dedicado.
- **`master` sem cadastro próprio**: não existe fluxo de criar um usuário `master` pela aplicação (nem tela, nem endpoint) — precisa ser feito direto no banco. Aceitável pro estágio atual (poucos masters, sempre a própria equipe), mas vale endereçar se o número crescer.

## Backlog / evolução futura (pós-Sprint 10)

Do `PLAN.md`:

- Suporte a novos marketplaces além do Mercado Livre.
- Notificações em tempo real (websockets/push) — hoje é só polling (30s no frontend, 15min no scheduler).
- Aplicativo mobile.
- Relatórios avançados/BI.

## Candidatos a próximos passos (não compromissados, só observações da equipe de execução)

- Cadastro/gestão de usuários `master` pela própria aplicação.
- Endpoint de "sincronizar agora" (hoje só existe o ciclo automático de 15min — útil pro usuário que acabou de conectar a conta e não quer esperar).
- Retry configurável / painel de jobs falhados, além do que já existe em `sync_logs` (hoje é só leitura passiva no alerta do dashboard).
