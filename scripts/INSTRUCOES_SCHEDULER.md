# Scheduler do Laravel (sincronização com o Mercado Livre)

O Sprint 4 depende do scheduler do Laravel (`php artisan schedule:run`) rodando a cada minuto para disparar a renovação de tokens e a sincronização de produtos/pedidos/pagamentos/mensagens automaticamente. No Linux isso seria um cron; no Windows usamos o **Task Scheduler**.

## O que já está configurado nesta máquina

Uma tarefa chamada **"ScrapDash Laravel Scheduler"** já foi criada, rodando a cada minuto. Ela não precisou de privilégios de administrador.

A tarefa chama `scripts/run-scheduler-hidden.vbs` (em vez de chamar `scripts/run-scheduler.bat` diretamente) — esse `.vbs` só abre o `.bat` com janela oculta (`WScript.Shell.Run ..., 0, True`). Sem isso, uma janela de CMD pisca na tela a cada minuto, já que o modo de logon da tarefa é "Interativo".

- Ver a tarefa: `schtasks /query /tn "ScrapDash Laravel Scheduler" /v /fo list`
- Rodar manualmente uma vez: `schtasks /run /tn "ScrapDash Laravel Scheduler"`
- Remover: `schtasks /delete /tn "ScrapDash Laravel Scheduler" /f`
- Log de execução: `backend/storage/logs/scheduler.log`

## Recriar em outra máquina

Se for configurar em outro ambiente Windows, rode (não precisa ser administrador):

```
schtasks /create /tn "ScrapDash Laravel Scheduler" /tr "wscript.exe //B C:\xampp\htdocs\scrapdash\scripts\run-scheduler-hidden.vbs" /sc minute /mo 1 /st 00:00 /f
```

Ajuste os caminhos dentro de `scripts/run-scheduler-hidden.vbs` e `scripts/run-scheduler.bat` se o projeto estiver em outro lugar.

## Fila (queue)

Os jobs de sincronização (`SyncProductsJob`, `SyncOrdersJob`, etc.) são despachados para a fila (`QUEUE_CONNECTION=database`), não executados na hora. **Sem algo consumindo essa fila, os jobs ficam parados na tabela `jobs` para sempre** — foi exatamente isso que causou o dashboard aparecer zerado mesmo com a conta conectada e sincronizando "normalmente" pelo scheduler.

### O que já está configurado nesta máquina

Uma segunda tarefa, **"ScrapDash Laravel Queue Worker"**, roda `php artisan queue:work --stop-when-empty` a cada minuto (mesmo mecanismo da tarefa do scheduler, sem precisar de admin) — processa o que estiver na fila e sai, em vez de ficar rodando para sempre (rodar para sempre exigiria um gatilho "ao fazer logon", que pede privilégio de administrador neste Windows).

- Ver a tarefa: `schtasks /query /tn "ScrapDash Laravel Queue Worker" /v /fo list`
- Rodar manualmente uma vez: `schtasks /run /tn "ScrapDash Laravel Queue Worker"`
- Remover: `schtasks /delete /tn "ScrapDash Laravel Queue Worker" /f`
- Log de execução: `backend/storage/logs/queue-worker.log`

### Recriar em outra máquina

```
schtasks /create /tn "ScrapDash Laravel Queue Worker" /tr "wscript.exe //B C:\xampp\htdocs\scrapdash\scripts\run-queue-worker-hidden.vbs" /sc minute /mo 1 /st 00:00 /f
```

### Rodando manualmente (desenvolvimento/depuração)

Para acompanhar a fila sendo processada em tempo real num terminal (em vez de esperar a tarefa do minuto):

```
cd backend
php artisan queue:work
```

Ou usar `composer dev` na raiz do projeto, que já sobe `queue:listen` e `schedule:work` juntos (mais o frontend). Se as tarefas do Task Scheduler acima já estiverem configuradas nesta máquina, rodar `composer dev` ao mesmo tempo é redundante mas inofensivo — os jobs usam `withoutOverlapping()`, então a segunda tentativa concorrente só é ignorada.
