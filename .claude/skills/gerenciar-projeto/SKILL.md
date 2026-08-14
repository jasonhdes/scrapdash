---
name: gerenciar-projeto
description: Use quando o usuário disser "ativar projeto" (ligar/subir o ambiente de dev do Scrap Dash), "desativar projeto" (derrubar os processos do projeto) ou "reiniciar projeto" (desativar e ativar de novo). Cobre Apache/MySQL (XAMPP) e os processos do Scrap Dash (queue worker, scheduler e frontend Next.js via `composer dev`).
---

# Ativar / desativar / reiniciar o ambiente do Scrap Dash

Projeto na raiz `C:\xampp\htdocs\scrapdash`. O ambiente completo tem duas partes:

1. **Apache + MySQL (XAMPP)** — servem o backend Laravel via VirtualHost `scrapdash.local`. Não precisa de `php artisan serve`.
2. **`composer dev`** (rodado na raiz do projeto) — sobe de uma vez: queue worker (`php artisan queue:listen`), scheduler (`php artisan schedule:work`) e o frontend Next.js (`npm run dev`), via `npx concurrently`.

⚠️ **`composer` só é encontrado via PowerShell nesse ambiente** (`composer.bat` está em `C:\xampp\php\composer.bat`, fora do PATH do Bash tool). Sempre use a ferramenta **PowerShell** para os comandos de `composer`/XAMPP, nunca Bash.

## Comando "ativar projeto"

1. Verifique se Apache e MySQL já estão de pé:
   ```powershell
   tasklist | findstr /i "httpd.exe mysqld.exe"
   ```
   Se `httpd.exe` não aparecer, rode `C:\xampp\apache_start.bat`. Se `mysqld.exe` não aparecer, rode `C:\xampp\mysql_start.bat`. Esses scripts abrem o processo e retornam — não precisam rodar em background.

2. Verifique se os processos do próprio projeto já estão rodando (evita duplicar e gerar conflito de porta, como já aconteceu antes):
   ```powershell
   Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'scrapdash' -and $_.Name -in @('php.exe','node.exe') } | Select-Object ProcessId, Name, CommandLine
   ```
   Se já houver resultado (queue, scheduler e/ou next dev rodando), **não inicie de novo** — pule pro passo 4 e só confirme/reporte o que já está de pé.

3. Se nada estiver rodando, suba tudo com PowerShell, em background:
   ```powershell
   Set-Location "C:\xampp\htdocs\scrapdash"; composer dev
   ```
   Use `run_in_background: true`. Leia o output do processo até aparecer a linha `- Local: http://localhost:XXXX` do Next.js (a porta pode não ser 3000 se já estiver ocupada por outra coisa).

4. Confirme que o frontend responde:
   ```powershell
   Invoke-WebRequest http://localhost:<porta> -TimeoutSec 8 | Select-Object StatusCode
   ```
   (ou `curl` via Bash, tanto faz pra essa checagem).

5. Reporte ao usuário: Apache/MySQL ok, queue/scheduler ok, e a URL real do frontend.

## Comando "desativar projeto"

1. Encontre e derrube **só** os processos do próprio Scrap Dash — nunca mate `httpd.exe`/`mysqld.exe` automaticamente, eles são compartilhados com outros projetos do XAMPP em `htdocs`:
   ```powershell
   Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'scrapdash' -and $_.Name -in @('php.exe','node.exe') } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
   ```

2. Confirme que sumiram (repita a query do passo 1 — deve voltar vazio) e que a porta do frontend parou de responder.

3. Reporte o que foi encerrado (queue, scheduler, frontend). Se sobrar algum processo teimoso que a query não pegou (comando de `next dev`/turbopack às vezes spawna workers com command line reduzida), avise o usuário em vez de matar processos "no escuro" por nome genérico.

## Comando "reiniciar projeto"

Execute "desativar projeto" (seção acima) e, depois de confirmar que os processos sumiram, execute "ativar projeto" do zero (sem pular o passo 3, já que agora nada estará rodando).

## Cuidados gerais

- Nunca use `taskkill /F /IM php.exe` ou `/IM node.exe` sem o filtro por `CommandLine` — mataria qualquer outro processo PHP/Node do sistema, não só os do Scrap Dash.
- Apache/MySQL só são desligados se o usuário pedir isso explicitamente fora desses três comandos — "desativar projeto" e "reiniciar projeto" não tocam neles.
- Sempre valide com uma checagem real (tasklist / requisição HTTP) antes de reportar sucesso — não assuma que um comando funcionou só porque não deu erro.
