'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { triggerMercadoLivreSync } from '@/services/accounts';
import {
  closePeriod,
  getFinancialPeriods,
  refreshReturns,
  refreshSales,
  updateMercadoPagoField,
  updatePeriodField,
} from '@/services/financial';
import { createPurchase, deletePurchase, listPurchases } from '@/services/purchases';
import type { EditablePeriodField, FinancialPeriodSnapshot, FinancialPeriods } from '@/types/financial';
import type { Purchase } from '@/types/purchase';
import { Pagination } from '@/components/shared/Pagination';
import { BRASILIA_TIMEZONE } from '@/utils/format';

const inputClass =
  'rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const buttonClass =
  'rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black dark:border-strokedark dark:text-white';
const primaryButtonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60';

const FIELD_LABELS: Record<EditablePeriodField, string> = {
  previous_balance: 'Saldo anterior',
  total_sales: 'Total de vendas',
  held_balance: 'Saldo retido',
  refunded_balance: 'Saldo reembolsado',
  discounts: 'Descontos',
};

// Todos os 5 campos guardados no período — usado pra exibir a linha
// "Último fechamento" (as 5 cartas somam com "saldo anterior" incluso).
const PERIOD_FIELDS: EditablePeriodField[] = [
  'previous_balance',
  'total_sales',
  'held_balance',
  'refunded_balance',
  'discounts',
];

// Na linha "Período atual", "saldo anterior" não é mais um campo solto
// editável — vira o cartão calculado "Saldo atual" (ending_balance).
const CURRENT_ROW_EDITABLE_FIELDS: EditablePeriodField[] = [
  'total_sales',
  'held_balance',
  'refunded_balance',
  'discounts',
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: BRASILIA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-sm border border-stroke bg-white px-5 py-5 text-center shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      <span className="text-sm font-medium text-body dark:text-bodydark">{label}</span>
      {children}
    </div>
  );
}

export function FinancialPeriodCards({
  accountId,
  token,
  onRefreshAll,
}: {
  accountId: number | null;
  token: string | null;
  onRefreshAll?: () => void | Promise<void>;
}) {
  const [periods, setPeriods] = useState<FinancialPeriods | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesMeta, setPurchasesMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [showPurchases, setShowPurchases] = useState(false);

  const [editingField, setEditingField] = useState<EditablePeriodField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [isRefreshingSales, setIsRefreshingSales] = useState(false);
  const [isRefreshingReturns, setIsRefreshingReturns] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({ occurred_at: '', description: '', value: '' });
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);

  const [mercadoPagoForm, setMercadoPagoForm] = useState({ pending_balance: '', available_balance: '' });
  const [isSavingMercadoPago, setIsSavingMercadoPago] = useState(false);
  const mercadoPagoInitialized = useRef(false);

  const load = useCallback(async () => {
    if (!accountId || !token) return;
    const [periodsRes, purchasesRes] = await Promise.all([
      getFinancialPeriods(accountId, token),
      listPurchases(accountId, token, { page: purchasesPage, perPage: 5 }),
    ]);
    setPeriods(periodsRes);
    setPurchases(purchasesRes.data);
    setPurchasesMeta(purchasesRes.meta);
  }, [accountId, token, purchasesPage]);

  useEffect(() => {
    load();
  }, [load]);

  // Só preenche os campos a partir do que já foi salvo na PRIMEIRA vez que
  // os dados chegam — depois disso o formulário é todo controlado pelo que
  // o usuário está digitando, sem levar susto de outra ação (ex: editar um
  // campo do período) resetar o que ainda não foi salvo aqui.
  useEffect(() => {
    if (periods && !mercadoPagoInitialized.current) {
      setMercadoPagoForm({
        pending_balance: periods.mercadopago.pending_balance !== null ? String(periods.mercadopago.pending_balance) : '',
        available_balance: periods.mercadopago.available_balance !== null ? String(periods.mercadopago.available_balance) : '',
      });
      mercadoPagoInitialized.current = true;
    }
  }, [periods]);

  async function handleSaveMercadoPago() {
    if (!accountId || !token) return;
    const pending = Number(mercadoPagoForm.pending_balance.replace(',', '.'));
    const available = Number(mercadoPagoForm.available_balance.replace(',', '.'));
    if (Number.isNaN(pending) || Number.isNaN(available)) return;
    setIsSavingMercadoPago(true);
    try {
      await updateMercadoPagoField(accountId, token, 'pending_balance', pending);
      const updated = await updateMercadoPagoField(accountId, token, 'available_balance', available);
      setPeriods(updated);
    } finally {
      setIsSavingMercadoPago(false);
    }
  }

  async function handleSaveField(field: EditablePeriodField) {
    if (!accountId || !token) return;
    const value = Number(editValue.replace(',', '.'));
    if (Number.isNaN(value)) return;
    setIsSavingField(true);
    try {
      const updated = await updatePeriodField(accountId, token, field, value);
      setPeriods(updated);
      setEditingField(null);
    } finally {
      setIsSavingField(false);
    }
  }

  async function handleRefreshSales() {
    if (!accountId || !token) return;
    setIsRefreshingSales(true);
    try {
      await triggerMercadoLivreSync(accountId, token);
      // Sincronização é assíncrona (vai pra fila) — dá um respiro curto
      // pro worker processar antes de recalcular, senão o clique quase
      // sempre recarrega os mesmos números de antes.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const updated = await refreshSales(accountId, token);
      setPeriods(updated);
      // "Atualizar vendas" precisa atualizar a Lista de pedidos também
      // (vive no componente pai) — senão os pedidos mais recentes não
      // aparecem nem lá nem no total recalculado.
      await onRefreshAll?.();
    } finally {
      setIsRefreshingSales(false);
    }
  }

  async function handleRefreshReturns() {
    if (!accountId || !token) return;
    setIsRefreshingReturns(true);
    try {
      const updated = await refreshReturns(accountId, token);
      setPeriods(updated);
    } finally {
      setIsRefreshingReturns(false);
    }
  }

  async function handleClosePeriod() {
    if (!accountId || !token) return;
    if (!confirm('Fechar o período atual? Os valores de agora viram histórico e um período novo começa.')) return;
    setIsClosing(true);
    try {
      const updated = await closePeriod(accountId, token);
      setPeriods(updated);
    } finally {
      setIsClosing(false);
    }
  }

  async function handleCreatePurchase(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !token) return;
    setIsSavingPurchase(true);
    try {
      await createPurchase(accountId, token, {
        occurred_at: purchaseForm.occurred_at,
        description: purchaseForm.description,
        value: Number(purchaseForm.value),
      });
      setPurchaseForm({ occurred_at: '', description: '', value: '' });
      setPurchasesPage(1);
      await load();
    } finally {
      setIsSavingPurchase(false);
    }
  }

  async function handleDeletePurchase(purchaseId: number) {
    if (!accountId || !token) return;
    if (!confirm('Remover essa despesa?')) return;
    await deletePurchase(accountId, token, purchaseId);
    await load();
  }

  if (!periods) {
    return <p className="text-sm text-body dark:text-bodydark">Carregando período financeiro...</p>;
  }

  function renderEditableCard(field: EditablePeriodField, snapshot: FinancialPeriodSnapshot) {
    const isEditing = editingField === field;

    return (
      <Card key={field} label={FIELD_LABELS[field]}>
        {isEditing ? (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step="0.01"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className={`${inputClass} w-28`}
            />
            <button
              type="button"
              disabled={isSavingField}
              onClick={() => handleSaveField(field)}
              className={primaryButtonClass}
            >
              Salvar
            </button>
            <button type="button" onClick={() => setEditingField(null)} className={buttonClass}>
              Cancelar
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <span className="block text-title-md font-bold text-black dark:text-white">
              {formatCurrency(snapshot[field])}
            </span>
            <button
              type="button"
              title={`Editar ${FIELD_LABELS[field]}`}
              onClick={() => {
                setEditValue(String(snapshot[field]));
                setEditingField(field);
              }}
              className="text-body hover:text-primary dark:text-bodydark"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          </div>
        )}
        {field === 'total_sales' && (
          <button
            type="button"
            disabled={isRefreshingSales}
            onClick={handleRefreshSales}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {isRefreshingSales ? 'Atualizando...' : 'Atualizar vendas'}
          </button>
        )}
        {(field === 'held_balance' || field === 'refunded_balance' || field === 'discounts') && (
          <button
            type="button"
            disabled={isRefreshingReturns}
            onClick={handleRefreshReturns}
            title="Recalcula os 3 campos (retido/reembolsado/descontos) a partir das atualizações registradas nos pedidos"
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {isRefreshingReturns ? 'Atualizando...' : 'Atualizar'}
          </button>
        )}
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Período atual</h2>
          <span className="text-sm text-body dark:text-bodydark">
            Aberto desde: {formatDateTime(periods.current.created_at)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card label="Saldo atual">
            <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
              {formatCurrency(periods.current.ending_balance)}
            </span>
          </Card>
          {CURRENT_ROW_EDITABLE_FIELDS.map((field) => renderEditableCard(field, periods.current))}
          <Card label="Despesas">
            <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
              {formatCurrency(periods.current.despesas)}
            </span>
            <button
              type="button"
              onClick={() => setShowPurchases((v) => !v)}
              className="mt-1 text-xs font-medium text-primary hover:underline"
            >
              {showPurchases ? 'Ocultar lançamentos' : 'Ver lançamentos'}
            </button>
          </Card>
        </div>

        <div className="flex flex-wrap items-end gap-4 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark">
          <span className="text-sm font-semibold text-black dark:text-white">Mercado Pago</span>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mp-pending" className="text-sm font-medium text-black dark:text-white">
              Saldo a receber
            </label>
            <input
              id="mp-pending"
              type="number"
              step="0.01"
              value={mercadoPagoForm.pending_balance}
              onChange={(e) => setMercadoPagoForm((f) => ({ ...f, pending_balance: e.target.value }))}
              className={`${inputClass} w-32`}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="mp-available" className="text-sm font-medium text-black dark:text-white">
              Saldo disponível
            </label>
            <input
              id="mp-available"
              type="number"
              step="0.01"
              value={mercadoPagoForm.available_balance}
              onChange={(e) => setMercadoPagoForm((f) => ({ ...f, available_balance: e.target.value }))}
              className={`${inputClass} w-32`}
            />
          </div>

          <button
            type="button"
            disabled={isSavingMercadoPago}
            onClick={handleSaveMercadoPago}
            className={primaryButtonClass}
          >
            {isSavingMercadoPago ? 'Salvando...' : 'Salvar'}
          </button>

          {(() => {
            const pending = Number(mercadoPagoForm.pending_balance.replace(',', '.')) || 0;
            const available = Number(mercadoPagoForm.available_balance.replace(',', '.')) || 0;
            const soma = pending + available;
            const diferenca = soma - periods.current.ending_balance;
            const diffColor =
              diferenca < 0 ? 'text-danger' : diferenca > 0 ? 'text-success' : 'text-meta-5';

            return (
              <>
                <div className="flex flex-col gap-1.5 text-center">
                  <span className="text-sm font-medium text-black dark:text-white">Soma</span>
                  <span className="text-lg font-bold text-black dark:text-white">{formatCurrency(soma)}</span>
                </div>
                <div className="flex flex-col gap-1.5 text-center">
                  <span className="text-sm font-medium text-black dark:text-white">Diferença</span>
                  <span className={`text-lg font-bold ${diffColor}`}>{formatCurrency(diferenca)}</span>
                </div>
              </>
            );
          })()}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={isClosing}
            onClick={handleClosePeriod}
            className={primaryButtonClass}
          >
            {isClosing ? 'Fechando...' : 'Fechar período'}
          </button>
        </div>
      </div>

      {showPurchases && (
        <div className="flex flex-col gap-3 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark">
          <form onSubmit={handleCreatePurchase} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-date" className="text-sm font-medium text-black dark:text-white">
                Data
              </label>
              <input
                id="expense-date"
                type="date"
                required
                value={purchaseForm.occurred_at}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, occurred_at: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-1 min-w-[200px] flex-col gap-1.5">
              <label htmlFor="expense-description" className="text-sm font-medium text-black dark:text-white">
                Descrição
              </label>
              <input
                id="expense-description"
                type="text"
                required
                placeholder="Ex: compra de estoque"
                value={purchaseForm.description}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, description: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="expense-value" className="text-sm font-medium text-black dark:text-white">
                Valor
              </label>
              <input
                id="expense-value"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={purchaseForm.value}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, value: e.target.value }))}
                className={`${inputClass} w-32`}
              />
            </div>
            <button type="submit" disabled={isSavingPurchase} className={primaryButtonClass}>
              {isSavingPurchase ? 'Salvando...' : 'Adicionar'}
            </button>
          </form>

          {purchases.length === 0 ? (
            <p className="text-sm text-body dark:text-bodydark">Nenhuma despesa lançada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-center dark:bg-meta-4">
                    <th className="px-4 py-3 font-medium text-black dark:text-white">Data</th>
                    <th className="px-4 py-3 font-medium text-black dark:text-white">Descrição</th>
                    <th className="px-4 py-3 font-medium text-black dark:text-white">Valor</th>
                    <th className="px-4 py-3 font-medium text-black dark:text-white"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="border-b border-stroke px-4 py-2 text-center text-body dark:border-strokedark dark:text-bodydark">
                        {new Date(purchase.occurred_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                      </td>
                      <td className="border-b border-stroke px-4 py-2 text-black dark:border-strokedark dark:text-white">
                        {purchase.description}
                      </td>
                      <td className="border-b border-stroke px-4 py-2 text-center text-black dark:border-strokedark dark:text-white">
                        {formatCurrency(purchase.value)}
                      </td>
                      <td className="border-b border-stroke px-4 py-2 text-center dark:border-strokedark">
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(purchase.id)}
                          className="text-xs font-medium text-danger hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {purchasesMeta.last_page > 1 && (
            <Pagination
              currentPage={purchasesMeta.current_page}
              lastPage={purchasesMeta.last_page}
              total={purchasesMeta.total}
              onChange={setPurchasesPage}
            />
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Último fechamento</h2>
          <span className="text-sm text-body dark:text-bodydark">
            {periods.previous
              ? `Fechado em: ${formatDateTime(periods.previous.closed_at)}`
              : 'Nenhum fechamento anterior'}
          </span>
        </div>

        {periods.previous && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {PERIOD_FIELDS.map((field) => (
              <Card key={field} label={FIELD_LABELS[field]}>
                <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
                  {formatCurrency(periods.previous![field])}
                </span>
              </Card>
            ))}
            <Card label="Despesas">
              <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
                {formatCurrency(periods.previous.despesas)}
              </span>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
