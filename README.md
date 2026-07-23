# Scrap Dash

App de gestão para vendedores do Mercado Livre (Laravel + Next.js). Contexto completo em [RESUMO.md](RESUMO.md) e plano de execução em [PLAN.md](PLAN.md).

## Como rodar o projeto

**Pré-requisitos:** XAMPP (PHP 8.2+ e MySQL/MariaDB) e Node.js 20+ instalados.

1. **Clone o repositório** dentro de `C:\xampp\htdocs\` (ex.: `C:\xampp\htdocs\scrapdash`).
2. **Configure o domínio local** seguindo `scripts/INSTRUCOES_VHOST.md` (VirtualHost do Apache + arquivo `hosts` apontando `scrapdash.local` para `127.0.0.1`) e inicie o Apache/MySQL pelo painel do XAMPP.
3. **Backend:** dentro de `backend/`, rode `composer install`, copie `.env.example` para `.env` (ajuste `DB_DATABASE=scrapdash`, gere `JWT_SECRET` com `php artisan jwt:secret` e preencha `MERCADOLIVRE_CLIENT_ID`/`MERCADOLIVRE_CLIENT_SECRET` se for testar a integração), crie o banco `scrapdash` no MySQL e rode `php artisan key:generate` seguido de `php artisan migrate`.
4. **Frontend:** dentro de `frontend/`, rode `npm install`.
5. **Suba os serviços:** `php artisan serve` (ou acesse via `http://scrapdash.local` com o Apache) para o backend, e `npm run dev` dentro de `frontend/` para o Next.js (`http://localhost:3000`).

> Este README é mantido atualizado a cada sprint concluído do [PLAN.md](PLAN.md). Se algum passo mudar (nova variável de ambiente, novo serviço, etc.), ele é a primeira coisa a ser revisada.
