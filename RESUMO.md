# Resumo do Projeto – Scrap Dash

## O que é

**Scrap Dash** (nome interno de infra: `scrapdash`) é um aplicativo web de gestão para vendedores do **Mercado Livre**, desenvolvido pela **JHS CORP**. Centraliza pedidos, produtos, pagamentos, mensagens e um dashboard financeiro/operacional, com sincronização automática via API oficial do Mercado Livre.

- **Código-fonte / nomenclatura técnica:** inglês.
- **Interface do usuário:** Português do Brasil.
- **Dados em tempo (quase) real**, via jobs assíncronos + scheduler.

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Backend | Laravel (PHP) |
| Frontend | Next.js (React) |
| Banco de dados | MySQL |
| Infraestrutura (atualizada) | **XAMPP** (Apache + PHP + MySQL) no lugar de Docker; Next.js roda via Node.js separadamente |
| Integração externa | API Mercado Livre (OAuth2 + PKCE) |
| Proxy | Nginx / reverse proxy (camada lógica na arquitetura; local pode usar Apache do XAMPP) |

## Perfis de Usuário

1. **Master** — acesso total ao sistema.
2. **User** — dono de conta(s), gerencia contas de marketplace, funcionários e operação.
3. **User Partner** — acesso restrito conforme permissões atribuídas (RBAC).

## Módulos Funcionais

Login/Auth · Dashboard · Produtos · Pedidos · Financeiro · Mensagens · Funcionários · Permissões · Configurações · Integração Mercado Livre.

## Modelo de Dados (entidades centrais)

```
users → accounts → employees → products → orders → payments → messages
```

Relacionamentos principais:
- **User** possui múltiplas **Accounts** e múltiplos **Funcionários**.
- **Account** agrega **Produtos**, **Pedidos**, **Funcionários** e alimenta o **Dashboard**.
- **Pedido (Order)** relaciona-se a **Produto**, **Pagamento** e **Mensagens**.

## Arquitetura

```
Internet → HTTPS/JWT → Nginx/Reverse Proxy
                          ├── Frontend Next.js (React)
                          └── API Laravel (REST)
                                   └── Service Layer
                                        ├── Auth Module
                                        ├── Mercado Livre Module
                                        ├── Financeiro Module
                                        ├── Pedidos Module
                                        └── Funcionários Module
                                   └── Repository Layer → MySQL
                                        └── Laravel Queue → Scheduler → API Mercado Livre
```

### Backend (Laravel) — organização em DDD-like

```
app/
├── Domain/ (User, Account, Product, Order, Payment, Message)
├── Application/ (Services, DTO, Actions)
├── Infrastructure/ (MercadoLivre, Repositories, Cache, Queue)
├── Http/ (Controllers, Middleware, Requests, Resources)
├── Policies/, Jobs/, Events/, Listeners/, Notifications/, Console/
```

### Frontend (Next.js)

```
frontend/src/app/
├── pages/, components/, layouts/, hooks/, services/,
├── contexts/, store/, utils/, types/, styles/
```

## Integração com Mercado Livre

Fluxo do `MercadoLivreService`:
```
OAuth → Atualizar Token → Importar Produtos → Importar Pedidos →
Importar Pagamentos → Importar Mensagens → Sincronizar Dados
```

Jobs assíncronos dedicados: `SyncOrdersJob`, `SyncProductsJob`, `SyncPaymentsJob`, `SyncMessagesJob`, `RefreshTokenJob`, `CleanupJob`.

### Configuração DevCenter (Mercado Livre)
- Criar aplicação do tipo **Web**, nome sugerido "NoOEM Flow".
- Ativar **PKCE**, desativar **Device Grant**.
- Redirect URI de dev: `http://nooemflow.local/auth/mercadolivre/callback` (produção exige HTTPS).
- Variáveis `.env`: `MERCADOLIVRE_CLIENT_ID`, `MERCADOLIVRE_CLIENT_SECRET`, `MERCADOLIVRE_REDIRECT_URI`.

## Infraestrutura Local (XAMPP)

1. Editar `C:\xampp\apache\conf\extra\httpd-vhosts.conf` e criar VirtualHost apontando para `backend/public`.
2. Editar `hosts` do Windows: `127.0.0.1 scrapdash.local`.
3. Reiniciar Apache e testar `http://scrapdash.local`.
4. Next.js segue rodando via Node.js (fora do Apache), consumindo a API Laravel.

## Segurança

`JWT → Middleware → Policies → Roles → Permissions → Auditoria → Logs` — autenticação stateless, autorização por policies/roles/permissions, com trilha de auditoria.

## Dashboard (KPIs)

Receita, Pedidos, Produtos, Financeiro, Pagamentos, Mensagens e Alertas.

## Roadmap Original (10 Sprints)

1. Setup · 2. Usuários · 3. Integração ML · 4. Sincronização · 5. Dashboard · 6. Vendas · 7. Financeiro · 8. Mensagens · 9. Permissões · 10. Testes e Deploy.

## Evolução Futura

Suporte a novos marketplaces, notificações em tempo real, app mobile, relatórios avançados.

---

Ver **PLAN.md** para o plano de execução detalhado, adaptado à infraestrutura XAMPP e aos papéis definidos (engenheiro/idealizador + equipe de execução).
