---
name: sync-plan
description: Use SEMPRE ao final de qualquer tarefa de implementação neste projeto (scrapdash) — depois de criar/editar código, rodar migrations, configurar infraestrutura, criar telas, etc. Verifica o estado real do repositório contra o PLAN.md e marca/desmarca os checkboxes das tasks correspondentes, para que o usuário acompanhe visualmente o progresso de cada sprint. Também use quando o usuário pedir explicitamente para "verificar o PLAN.md", "atualizar checkboxes" ou "ver o que falta".
---

# Sincronizar PLAN.md com o estado real do projeto

Este projeto usa `PLAN.md` na raiz como painel visual de progresso (sprints com checkboxes `- [ ]` / `- [X]`). O usuário acompanha o andamento olhando esse arquivo, então ele precisa refletir a realidade do repositório, não a intenção.

## Processo

1. **Leia o `PLAN.md` atual** (raiz do projeto) para ver a lista de sprints e o estado atual dos checkboxes.

2. **Identifique o escopo relevante**: normalmente o sprint que acabou de receber trabalho nesta sessão. Se não estiver claro, revise do primeiro sprint com item desmarcado em diante — não pule sprints anteriores incompletos.

3. **Para cada checkbox desmarcado (`[ ]`) no escopo**, verifique a evidência real antes de marcar:
   - Arquivo/pasta existe? (`Read`/`Glob`)
   - Migration rodou? (`php artisan migrate:status` ou consulta ao banco)
   - Rota/endpoint responde? (teste rápido via `curl`)
   - Componente/tela existe no frontend?
   - Teste automatizado passa?
   Nunca marque um item como concluído só porque foi *mencionado* na conversa — confirme no estado atual do código/ambiente.

4. **Para cada checkbox já marcado (`[X]`)**, não precisa reverificar do zero toda vez — mas se algo nesta sessão claramente quebrou ou reverteu esse item (ex.: arquivo removido, config revertida), desmarque e explique por quê.

5. **Itens que dependem de ação do usuário** (credenciais reais, decisões de produto, edição de arquivos de sistema como `hosts`, deploy) só devem ser marcados se o usuário confirmou explicitamente que fez a ação — não assuma.

6. **Edite o PLAN.md** (`Edit` tool) marcando `[X]` os itens confirmados e, quando fizer sentido, adicione uma nota curta inline (ex.: "— validado via `php artisan migrate`") explicando a evidência. Para itens que permanecem `[ ]`, se o motivo não for óbvio pelo texto existente, adicione uma nota curta do que falta.

7. **Reporte ao usuário de forma concisa**: o que foi marcado agora e, se houver itens pendentes no escopo revisado, quais são e por que não foram concluídos — sem enumerar itens que já estavam corretamente marcados antes.

## Regras

- Não marque itens fora do escopo da tarefa recém-feita sem necessidade — mas se notar que um sprint anterior tem um item desmarcado que na verdade já está pronto (constatação incidental), pode corrigir e mencionar.
- Não invente trabalho novo para "completar" um checkbox — esta skill só sincroniza o documento com a realidade, não implementa funcionalidades.
- Mantenha o tom e formatação do PLAN.md (bullets, entregáveis, seções) consistentes com o restante do arquivo.
