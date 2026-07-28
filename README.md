# Scrap Dash

App de gestão para vendedores do Mercado Livre (Laravel + Next.js). Contexto completo em [RESUMO.md](RESUMO.md) e plano de execução em [PLAN.md](PLAN.md).

## Como rodar o projeto

**Pré-requisitos:** XAMPP (PHP 8.2+ e MySQL/MariaDB) e Node.js 20+ instalados.

1. **Clone o repositório** dentro de `C:\xampp\htdocs\` (ex.: `C:\xampp\htdocs\scrapdash`).
2. **Configure o domínio local** seguindo `scripts/INSTRUCOES_VHOST.md` (VirtualHost HTTP **e HTTPS** do Apache — HTTPS é obrigatório para o OAuth do Mercado Livre — + arquivo `hosts` apontando `scrapdash.local` para `127.0.0.1`) e inicie o Apache/MySQL pelo painel do XAMPP.
3. **Backend:** dentro de `backend/`, rode `composer install`, copie `.env.example` para `.env` (ajuste `DB_DATABASE=scrapdash`, gere `JWT_SECRET` com `php artisan jwt:secret`, e preencha `MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET` e `GOOGLE_CLIENT_ID` se for testar essas integrações — nenhum dos dois é obrigatório para rodar o resto do app), crie o banco `scrapdash` no MySQL e rode `php artisan key:generate` seguido de `php artisan migrate`.
4. **Frontend:** dentro de `frontend/`, rode `npm install` e copie `.env.example` para `.env.local` (preencha `NEXT_PUBLIC_GOOGLE_CLIENT_ID` se for testar login com Google).
5. **Suba os serviços:** na raiz do projeto, `composer dev` sobe de uma vez o worker da fila, o scheduler (sincronização com o Mercado Livre a cada 5/15min, via `schedule:work`) e o frontend Next.js (`http://localhost:3000`). O backend em si não precisa de comando nenhum — já é servido pelo Apache/XAMPP através do VirtualHost `scrapdash.local` configurado no passo 2. `Ctrl+C` encerra tudo de uma vez.
   - Alternativa manual (rodar cada serviço em seu próprio terminal, útil para depurar um deles isoladamente): `php artisan queue:listen` e `php artisan schedule:work` dentro de `backend/`, e `npm run dev` dentro de `frontend/`.
   - **Nota:** `php artisan pail` (log em tempo real, do scaffold padrão do Laravel) não funciona neste ambiente — precisa da extensão `pcntl`, que não existe nos builds nativos de PHP para Windows. Os logs continuam em `backend/storage/logs/laravel.log`, pode abrir/acompanhar esse arquivo diretamente se precisar.

> Este README é mantido atualizado a cada sprint concluído do [PLAN.md](PLAN.md). Se algum passo mudar (nova variável de ambiente, novo serviço, etc.), ele é a primeira coisa a ser revisada.
