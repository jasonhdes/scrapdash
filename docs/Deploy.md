# Deploy

## Estratégia decidida

**XAMPP-like** (VPS/servidor com Apache + PHP + MySQL, sem containerização) — decisão tomada com o dono do produto no Sprint 10, mantendo a mesma topologia usada em desenvolvimento em vez de migrar pra Docker/cloud agora. Isso significa deploy mais direto (o que já roda local é essencialmente o que vai rodar em produção), com a contrapartida de escalar/replicar sendo mais manual do que seria com containers — aceitável pro estágio atual do produto.

## Topologia de produção

```
Apache (porta 443, HTTPS obrigatório) ──► backend/public (Laravel)
                                       │
Next.js (build de produção, `next start` ou servido via proxy) ──► frontend
                                       │
MySQL/MariaDB
                                       │
Scheduler (a cada 1min) + Queue Worker (a cada 1min) — mesmo mecanismo do dev,
ver scripts/INSTRUCOES_SCHEDULER.md, adaptado do Task Scheduler do Windows
pro `cron` do Linux (ou Task Scheduler mesmo, se o servidor também for Windows)
```

## Diferenças obrigatórias em relação ao `.env` de desenvolvimento

| Variável | Dev | Produção |
|---|---|---|
| `APP_ENV` | `local` | `production` |
| `APP_DEBUG` | `true` | **`false`** — nunca deixar `true` em produção, expõe stack trace completo (inclusive de query SQL) em qualquer erro |
| `APP_URL` | `http://scrapdash.local` | domínio real, com `https://` |
| `MERCADOLIVRE_REDIRECT_URI` | `https://scrapdash.local/auth/mercadolivre/callback` | domínio real — **precisa ser recadastrada no DevCenter do Mercado Livre antes do go-live**, senão o OAuth quebra |
| `MERCADOLIVRE_FRONTEND_REDIRECT_URL` | `http://localhost:3000/dashboard` | domínio real do frontend |
| `NEXT_PUBLIC_API_URL` (frontend) | `http://scrapdash.local/api` | URL real da API |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_ID` | Client ID de teste (se configurado) | Client ID de produção — o Google exige que os domínios autorizados batam com a origem real |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | domínio real do frontend — **sem isso o navegador bloqueia todas as chamadas à API** |
| `JWT_SECRET` | gerado em dev | **gerar um novo** em produção (`php artisan jwt:secret`) — nunca reaproveitar o de dev |

## Passo a passo

1. Provisionar o servidor (Apache + PHP 8.2+ com as extensões que o Laravel usa: `pdo_mysql`, `mbstring`, `openssl`, `curl`, `zip` — sem `pcntl`, que é só necessário pro `pail`, ferramenta de dev que já sabemos não funcionar em Windows e que não precisa rodar em produção de qualquer forma) e MySQL/MariaDB.
2. Configurar VirtualHost HTTPS de verdade (certificado real — Let's Encrypt ou equivalente, não o autoassinado do XAMPP usado em dev) apontando pra `backend/public`.
3. `composer install --no-dev --optimize-autoloader` (sem as dependências de desenvolvimento).
4. Copiar `.env.example` → `.env`, preencher com os valores de produção da tabela acima.
5. `php artisan key:generate`, `php artisan jwt:secret`, `php artisan migrate --force`.
6. `php artisan config:cache && php artisan route:cache` — otimizações que fazem diferença real em produção (evita reparsear config/rotas a cada request).
7. Frontend: `npm ci && npm run build`, depois `npm run start` (ou servir os arquivos estáticos via proxy reverso do Apache/Nginx, se preferir não manter um processo Node rodando).
8. Configurar scheduler + queue worker persistentes (mesmo princípio de `scripts/INSTRUCOES_SCHEDULER.md`, adaptado pro SO do servidor de produção — `cron` no Linux, Task Scheduler se também for Windows).
9. Recadastrar a Redirect URI de produção no DevCenter do Mercado Livre (aplicações do ML só aceitam redirect URIs pré-cadastradas).
10. Testar o fluxo completo uma vez em produção antes de divulgar: registro → login → conectar Mercado Livre → sincronização rodando → dashboard populado.

## Checklist de go-live

- [ ] HTTPS com certificado real configurado (não o autoassinado do XAMPP).
- [ ] `APP_DEBUG=false` confirmado.
- [ ] `JWT_SECRET` gerado novo pra produção (não reaproveitado de dev).
- [ ] Redirect URI de produção cadastrada no DevCenter do Mercado Livre.
- [ ] `CORS_ALLOWED_ORIGINS` apontando pro domínio real do frontend.
- [ ] `Client ID` do Google (se login social for usado) configurado com o domínio real autorizado.
- [ ] Scheduler + queue worker rodando persistentemente (testado sobrevivendo a um restart do servidor).
- [ ] Backup do banco de dados configurado (não existe hoje nem em dev — definir cadência antes do go-live).
- [ ] Teste manual ponta a ponta em produção: registro → login → conectar Mercado Livre → aguardar um ciclo de sync → dashboard com dado real.
- [ ] Rate limiting confirmado ativo (`throttle:auth` em `/auth/*` público, `throttle:api` no resto) — testável com o mesmo script usado em dev (10 tentativas de login seguidas devem devolver 429 na 11ª).
