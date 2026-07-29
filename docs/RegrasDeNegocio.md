# Regras de Negócio

## Pedidos são só espelho — exceto "processado"

Produtos, pedidos, pagamentos e mensagens são **somente leitura** em relação ao Mercado Livre: o Scrap Dash nunca escreve de volta na API deles (criar/editar/excluir produto, mudar status de pedido, etc.). A única exceção é `orders.processed_at` — um campo **puramente local**, sem equivalente na API do ML, que serve só de checklist operacional do vendedor ("já embalei/despachei esse pedido"). Marcar/desmarcar não manda nada pro Mercado Livre.

## Datas: sempre a data real do evento, nunca a data de sincronização

Toda entidade sincronizada guarda `synced_at` (quando *nós* buscamos o dado) separado da data real do evento (`ordered_at`, `paid_at`, `sent_at` das mensagens). Confundir os dois já causou bug real mais de uma vez neste projeto — a data que importa pro usuário é sempre a do evento, `synced_at` é só metadado técnico de auditoria interna.

## Horários sempre em horário de Brasília

Independente do fuso do servidor ou da máquina de quem está olhando a tela, datas exibidas (frontend e export CSV) são convertidas explicitamente pra `America/Sao_Paulo`. O banco guarda tudo em UTC (padrão); a conversão é só na borda de exibição.

## Liberação do dinheiro (`money_release_date`)

- Vem do endpoint legado `/collections/{id}` da API do ML (o endpoint novo `/v1/payments/{id}` não devolve esse campo pros pagamentos testados).
- `released=false` com uma data no futuro significa "previsto" — ainda não caiu a régua real de liberação, é só a expectativa.
- Ordenar por "próximo a receber o pagamento" = ordenar por `money_release_date` crescente **e** empurrar pedidos sem pagamento aprovado ainda (data nula) pro fim da lista — nos dois sentidos de ordenação. Sem isso, pedidos sem dado nenhum apareceriam artificialmente primeiro no crescente, já que NULL conta como o menor valor possível no MySQL.

## Conciliação financeira

`GET /financial/reconciliation` lista pedidos com status `paid` cuja soma dos pagamentos `approved` diverge do `total_amount` do pedido em mais de R$0,01. Não é filtrado por período — é uma lista de pendências a resolver, não um relatório histórico. Divergência mais comum observada em dados reais: frete incluso no valor do pagamento mas não no total do pedido (ou o contrário).

## "Fila de processamento" de pedidos

Não é uma fila de verdade (sem worker, sem ordem de prioridade) — é o filtro `processed=0` na listagem de pedidos. O nome no PLAN.md é aspiracional; a implementação é deliberadamente simples porque resolve o mesmo problema prático.

## Pedidos do mesmo "pack"

Quando o comprador leva vários itens numa única compra, o Mercado Livre agrupa isso num `pack_id` compartilhado entre os pedidos. Mensagens de pós-venda são por **pack**, não por pedido — um comprador que fez 3 pedidos no mesmo pack tem uma única conversa, não três. `OrderController`, `MessageController` e o filtro de mensagens do dashboard levam isso em conta ao resolver "qual conversa pertence a esse pedido".

## Sessão expira em 60 minutos, sem exceção

Não existe renovação silenciosa em background nem sessão "lembrar de mim" que estenda isso. Depois de 60 minutos sem uma ação explícita do usuário (clicar em "Atualizar"), a sessão é encerrada e exige login de novo. Ver `Fluxos.md#sessão-e-expiração-de-token` para o fluxo completo.

## Cache do dashboard

`GET /dashboard` é cacheado por 30 segundos por conta+período (`Cache::remember`). Uma ação que muda dado visível no dashboard (ex.: marcar pedido como processado) pode levar até 30s pra refletir lá — é uma escolha deliberada de performance, não um bug, dado o volume de queries agregadas que esse endpoint faz.

## Permissões e papéis

Cobertas em detalhe em `Permissoes.md` — resumo: `master` tem acesso total ao sistema; `user` é dono de conta(s) e tem acesso total às suas próprias contas; `user_partner` (funcionário) só acessa o que foi explicitamente atribuído, por conta e por módulo.
