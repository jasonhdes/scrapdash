# Scheduler do Laravel (sincronização com o Mercado Livre)

O Sprint 4 depende do scheduler do Laravel (`php artisan schedule:run`) rodando a cada minuto para disparar a renovação de tokens e a sincronização de produtos/pedidos/pagamentos/mensagens automaticamente. No Linux isso seria um cron; no Windows usamos o **Task Scheduler**.

## O que já está configurado nesta máquina

Uma tarefa chamada **"ScrapDash Laravel Scheduler"** já foi criada, rodando `scripts/run-scheduler.bat` a cada minuto. Ela não precisou de privilégios de administrador.

- Ver a tarefa: `schtasks /query /tn "ScrapDash Laravel Scheduler" /v /fo list`
- Rodar manualmente uma vez: `schtasks /run /tn "ScrapDash Laravel Scheduler"`
- Remover: `schtasks /delete /tn "ScrapDash Laravel Scheduler" /f`
- Log de execução: `backend/storage/logs/scheduler.log`

## Recriar em outra máquina

Se for configurar em outro ambiente Windows, rode (não precisa ser administrador):

```
schtasks /create /tn "ScrapDash Laravel Scheduler" /tr "C:\xampp\htdocs\scrapdash\scripts\run-scheduler.bat" /sc minute /mo 1 /st 00:00 /f
```

Ajuste o caminho dentro de `scripts/run-scheduler.bat` se o projeto estiver em outro lugar.

## Fila (queue)

Os jobs de sincronização (`SyncProductsJob`, `SyncOrdersJob`, etc.) são despachados para a fila (`QUEUE_CONNECTION=database`), não executados na hora. Para eles rodarem de fato, também é preciso ter um worker consumindo a fila:

```
cd backend
php artisan queue:work
```

Em produção isso rodaria como um serviço; localmente, é preciso deixar esse comando rodando manualmente em um terminal enquanto testa a sincronização automática (ou usar `composer run dev`, que já sobe o `queue:listen` junto do servidor).
