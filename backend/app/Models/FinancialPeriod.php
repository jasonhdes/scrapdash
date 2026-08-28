<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FinancialPeriod extends Model
{
    protected $fillable = [
        'account_id',
        'previous_balance',
        'total_sales',
        'held_balance',
        'refunded_balance',
        'discounts',
        'closed_at',
    ];

    protected function casts(): array
    {
        return [
            'previous_balance' => 'decimal:2',
            'total_sales' => 'decimal:2',
            'held_balance' => 'decimal:2',
            'refunded_balance' => 'decimal:2',
            'discounts' => 'decimal:2',
            'closed_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<Account, $this>
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * Soma de `purchases` dentro da janela deste período — "despesas" não
     * tem coluna própria aqui, é sempre derivada da lista de lançamentos já
     * existente, igual antes.
     */
    public function despesas(): float
    {
        return (float) Purchase::where('account_id', $this->account_id)
            ->where('occurred_at', '>=', $this->created_at)
            ->when($this->closed_at, fn ($q) => $q->where('occurred_at', '<=', $this->closed_at))
            ->sum('value');
    }

    /**
     * Total de vendas recalculado ao vivo a partir dos pagamentos reais,
     * na janela deste período (aberta se ainda não fechou). Usado só pra
     * períodos JÁ fechados: como a janela é fixa e o dado é objetivamente
     * conhecido, não faz sentido confiar num valor manual/desatualizado —
     * mesmo raciocínio de `despesas()`. Pra um período aberto, o valor
     * exibido continua sendo `total_sales` (editável, só muda quando o
     * usuário edita ou clica em "Atualizar vendas").
     */
    public function computedTotalSales(): float
    {
        return (float) Payment::whereHas('order', fn ($q) => $q->where('account_id', $this->account_id))
            ->where('status', 'approved')
            ->where('paid_at', '>=', $this->created_at)
            ->when($this->closed_at, fn ($q) => $q->where('paid_at', '<=', $this->closed_at))
            ->sum('net_received_amount');
    }

    /**
     * "Total de vendas" pra exibição: valor guardado se o período ainda
     * está aberto (editável), recalculado ao vivo se já fechou.
     */
    public function totalSalesForDisplay(): float
    {
        return $this->closed_at ? $this->computedTotalSales() : (float) $this->total_sales;
    }

    /**
     * Soma das atualizações de "Valor retido" (status `valor_retido`)
     * registradas À MÃO nos pedidos dentro da janela deste período — usada
     * pelo botão "Atualizar" do card "Saldo retido" (o campo continua
     * editável à mão; isso só puxa o valor calculado pra dentro dele).
     * Só `source = 'manual'`: os registros automáticos derivam o valor do
     * `net_received_amount` do pagamento, que já entra separadamente em
     * `total_sales`/`computedTotalSales()` — somar eles aqui de novo
     * duplicaria o mesmo valor.
     */
    public function computedHeldBalance(): float
    {
        return $this->sumReturnsByStatus([OrderReturn::STATUS_VALOR_RETIDO]);
    }

    /**
     * Mesmo princípio, pro card "Saldo reembolsado" — soma o status
     * `estorno_valor` ("Cliente reembolsado").
     */
    public function computedRefundedBalance(): float
    {
        return $this->sumReturnsByStatus([OrderReturn::STATUS_ESTORNO_VALOR]);
    }

    /**
     * Mesmo princípio, pro card "Descontos" — soma "Desconto de venda" +
     * "Desconto de frete". O status `reembolso` (novo, dinheiro devolvido
     * direto ao cliente fora do fluxo do ML) NÃO entra aqui nem em nenhum
     * outro card do período — combinado explicitamente com o usuário: fica
     * só como registro no pedido, sem afetar o saldo do período.
     */
    public function computedDiscounts(): float
    {
        return $this->sumReturnsByStatus([OrderReturn::STATUS_DESCONTO_VENDA, OrderReturn::STATUS_DESCONTO_FRETE]);
    }

    /**
     * @param  array<int, string>  $statuses
     */
    private function sumReturnsByStatus(array $statuses): float
    {
        return (float) OrderReturn::where('account_id', $this->account_id)
            ->where('source', 'manual')
            ->whereIn('status', $statuses)
            ->where('occurred_at', '>=', $this->created_at)
            ->when($this->closed_at, fn ($q) => $q->where('occurred_at', '<=', $this->closed_at))
            ->sum('value');
    }

    /**
     * "Saldo atual" (linha "Período atual"): saldo anterior + vendas -
     * retido + reembolsado - descontos - despesas. `refunded_balance`
     * entra SOMADO de propósito — representa dinheiro que voltou pro
     * vendedor (ex.: mediação resolvida a favor), não dinheiro que saiu;
     * quem sai é `held_balance` (retido).
     */
    public function endingBalance(): float
    {
        return (float) $this->previous_balance
            + $this->totalSalesForDisplay()
            - (float) $this->held_balance
            + (float) $this->refunded_balance
            - (float) $this->discounts
            - $this->despesas();
    }
}
