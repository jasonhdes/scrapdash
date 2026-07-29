# Casos de Uso

Organizado por persona. "Pode" aqui já reflete a aplicação real das permissões (`Permissoes.md`), não só a intenção.

## Master

- Ver e acessar qualquer conta do sistema, de qualquer dono, sem precisar de atribuição.
- Todas as ações abaixo listadas para "Dono de conta", em qualquer conta.
- **Não pode**: hoje não existe uma tela de administração global (listar todos os usuários/contas do sistema, por exemplo) — o `master` usa as mesmas telas do `user`, só que sem a restrição de "só minhas contas". Isso é uma lacuna conhecida, não um limite intencional — ver `Roadmap.md`.

## Dono de conta (`user`)

- Cadastrar-se (e-mail/senha ou Google) — ganha automaticamente uma conta principal.
- Conectar uma conta do Mercado Livre (OAuth) — obrigatório antes de qualquer sincronização acontecer.
- Ver o dashboard consolidado (receita, pedidos, produtos, pagamentos, mensagens, alertas).
- Ver e filtrar produtos, pedidos, pagamentos.
- Marcar/desmarcar pedidos como processados.
- Exportar pedidos em CSV.
- Ver e responder mensagens de pós-venda dos compradores.
- Ver conciliação financeira (divergências entre valor do pedido e valor aprovado).
- Cadastrar funcionários (`user_partner`) e conceder acesso granular (por conta, por módulo, ver/gerenciar) a cada um.
- Editar as permissões de um funcionário ou remover o acesso dele a uma conta, a qualquer momento.
- **Não pode**: acessar contas de outro dono; ver/gerenciar funcionários de contas que não são suas.

## Funcionário (`user_partner`)

- Fazer login normalmente (é um usuário de verdade, com senha própria).
- Ver **só** as contas que foram especificamente atribuídas a ele.
- Dentro de cada conta atribuída, ver/gerenciar **só** os módulos e ações concedidos (ex.: pode ver pedidos e produtos, mas não tem acesso nenhum ao financeiro).
- Ver o dashboard das contas atribuídas (acesso básico, não depende de permissão de módulo específica).
- **Não pode**: ver contas não atribuídas a ele (nem aparecem na lista); acessar um módulo sem a permissão `view` correspondente; alterar dado num módulo sem a permissão `manage`; gerenciar funcionários (nem os da própria conta); editar a conta em si (reconectar Mercado Livre, etc.) mesmo com `manage` em todos os módulos operacionais.

## Fluxo típico: dono contrata um funcionário só pra atender mensagens

1. Dono acessa `/employees`, cria um funcionário com nome/e-mail/senha.
2. Marca só `messages: [view, manage]` na grade de permissões (deixa produtos/pedidos/financeiro sem nenhuma marcação).
3. Funcionário loga com o e-mail/senha que o dono definiu.
4. `NavBar` do funcionário mostra só "Dashboard" e "Mensagens" — os outros links somem porque `permissions` não inclui `view` neles.
5. Funcionário responde mensagens normalmente; tentativa de acessar `/financial` diretamente (URL manual) recebe 403 do backend.

## Fluxo típico: comprador pergunta sobre um produto

1. `SyncMessagesJob` traz a pergunta na próxima janela de sincronização (até 15min de atraso).
2. Aparece como não lida no badge do `NavBar` e como alerta clicável no dashboard.
3. Vendedor (ou funcionário com permissão) abre `/messages`, vê a conversa, responde.
4. Resposta é enviada de volta pro Mercado Livre em tempo real (chamada síncrona, não passa pela fila).
