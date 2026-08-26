# Continuar — Scrap Dash

Branch: `258`
Data: 2026-08-25

## Onde paramos

Estendi a mesma regra descoberta nas planilhas — **valor líquido negativo no cancelamento = frete que ficou com o vendedor** — para a sincronização automática (`OrderReturnController::sync()`), aplicada nos três lugares onde o sistema já lida com valor líquido de pagamento:

1. **Desconto de venda** (pedido cancelado após 24h)
2. **Valor retido** (pagamento em mediação)
3. **Estorno de valor** (mediação resolvida)

Em qualquer um desses casos, se o valor líquido do pagamento vier negativo da API, agora o sistema separa isso automaticamente como um registro de **"desconto de frete"** (zerando o valor do evento principal, nunca deixando um valor negativo) — exatamente como fizemos na leitura das planilhas.

Testado numa transação revertida antes de aplicar de verdade (o token do Mercado Livre, que estava expirado, parece ter se renovado sozinho nesse meio tempo). Rodei a sincronização real: 561 registros criados, 302 atualizados. No momento não apareceu nenhum "desconto de frete" novo porque os dados atuais não têm valor líquido negativo — mas a regra já está ativa e vai pegar automaticamente da próxima vez que a API trouxer um caso desses.

## Próximo passo

Branch `258` deixado pronto para PR (commit feito). PR em si não foi aberto/pushado — isso fica a cargo do usuário no GitHub, conforme o fluxo de trabalho já estabelecido no projeto.
