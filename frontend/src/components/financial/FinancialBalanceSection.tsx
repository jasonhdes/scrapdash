'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getFinancialBalance,
  saveFinancialValidation,
  updateBalanceSeed,
} from '@/services/financial';
import { createPurchase, deletePurchase, listPurchases } from '@/services/purchases';
import type { FinancialBalance } from '@/types/financial';
import type { Purchase } from '@/types/purchase';
import { Pagination } from '@/components/shared/Pagination';
import { BRASILIA_TIMEZONE } from '@/utils/format';

const inputClass =
  'rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const buttonClass =
  'rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black dark:border-strokedark dark:text-white';
const primaryButtonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return 'Nunca validado';
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

interface BalanceCellProps {
  label: string;
  children: React.ReactNode;
}

function BalanceCell({ label, children }: BalanceCellProps) {
  return (
    <div className="flex flex-col items-center rounded-sm border border-stroke bg-white px-5 py-5 text-center shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
      <span className="text-sm font-medium text-body dark:text-bodydark">{label}</span>
      {children}
    </div>
  );
}

export function FinancialBalanceSection({
  accountId,
  token,
  refreshKey,
}: {
  accountId: number | null;
  token: string | null;
  refreshKey?: number;
}) {
  const [balance, setBalance] = useState<FinancialBalance | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesMeta, setPurchasesMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [showPurchases, setShowPurchases] = useState(false);

  const [isEditingSeed, setIsEditingSeed] = useState(false);
  const [seedInput, setSeedInput] = useState('');
  const [isSavingSeed, setIsSavingSeed] = useState(false);

  const [purchaseForm, setPurchaseForm] = useState({ occurred_at: '', description: '', value: '' });
  const [isSavingPurchase, setIsSavingPurchase] = useState(false);
  const [isSavingValidation, setIsSavingValidation] = useState(false);

  const load = useCallback(async () => {
    if (!accountId || !token) return;
    const [balanceRes, purchasesRes] = await Promise.all([
      getFinancialBalance(accountId, token),
      listPurchases(accountId, token, { page: purchasesPage, perPage: 5 }),
    ]);
    setBalance(balanceRes);
    setPurchases(purchasesRes.data);
    setPurchasesMeta(purchasesRes.meta);
  }, [accountId, token, purchasesPage]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, token, purchasesPage, refreshKey]);

  async function handleSaveSeed() {
    if (!accountId || !token) return;
    const value = Number(seedInput.replace(',', '.'));
    if (Number.isNaN(value)) return;
    setIsSavingSeed(true);
    try {
      const updated = await updateBalanceSeed(accountId, token, value);
      setBalance(updated);
      setIsEditingSeed(false);
    } finally {
      setIsSavingSeed(false);
    }
  }

  async function handleSaveValidation() {
    if (!accountId || !token) return;
    setIsSavingValidation(true);
    try {
      const updated = await saveFinancialValidation(accountId, token);
      setBalance(updated);
    } finally {
      setIsSavingValidation(false);
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
    if (!confirm('Remover essa compra?')) return;
    await deletePurchase(accountId, token, purchaseId);
    await load();
  }

  if (!balance) {
    return (
      <p className="text-sm text-body dark:text-bodydark">Carregando saldo...</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCell label="Saldo atual disponível">
          {isEditingSeed ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                autoFocus
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                className={`${inputClass} w-28`}
              />
              <button
                type="button"
                disabled={isSavingSeed}
                onClick={handleSaveSeed}
                className={primaryButtonClass}
              >
                Salvar
              </button>
              <button type="button" onClick={() => setIsEditingSeed(false)} className={buttonClass}>
                Cancelar
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-center gap-2">
              <span className="block text-title-md font-bold text-black dark:text-white">
                {balance.seed.value === null ? 'Saldo inicial não definido' : formatCurrency(balance.current_balance)}
              </span>
              <button
                type="button"
                title="Editar saldo inicial"
                onClick={() => {
                  setSeedInput(balance.seed.value !== null ? String(balance.seed.value) : '');
                  setIsEditingSeed(true);
                }}
                className="text-body hover:text-primary dark:text-bodydark"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </BalanceCell>

        <BalanceCell label="Saídas por compras">
          <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
            {formatCurrency(balance.purchases_total)}
          </span>
          <button
            type="button"
            onClick={() => setShowPurchases((v) => !v)}
            className="mt-1 text-xs font-medium text-primary hover:underline"
          >
            {showPurchases ? 'Ocultar lançamentos' : 'Ver lançamentos'}
          </button>
        </BalanceCell>

        <BalanceCell label="Saídas por cancelamento">
          <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
            {formatCurrency(balance.cancellations_total)}
          </span>
        </BalanceCell>

        <BalanceCell label="Saída por desconto em frete">
          <span className="mt-2 block text-title-md font-bold text-black dark:text-white">
            {formatCurrency(balance.freight_discounts_total)}
          </span>
        </BalanceCell>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-sm border border-stroke bg-white px-5 py-3 shadow-1 dark:border-strokedark dark:bg-boxdark">
        <div className="flex items-center gap-3 text-sm text-body dark:text-bodydark">
          <span>Última validação: {formatDateTime(balance.last_validated_at)}</span>
          {balance.pending_review_count > 0 && (
            <span className="rounded-full bg-warning/10 px-2.5 py-1 text-xs font-medium text-warning">
              {balance.pending_review_count} pendente(s) de conferência
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={isSavingValidation}
          onClick={handleSaveValidation}
          className={primaryButtonClass}
        >
          {isSavingValidation ? 'Salvando...' : 'Salvar validação'}
        </button>
      </div>

      {showPurchases && (
        <div className="flex flex-col gap-3 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark">
          <form onSubmit={handleCreatePurchase} className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="purchase-date" className="text-sm font-medium text-black dark:text-white">
                Data
              </label>
              <input
                id="purchase-date"
                type="date"
                required
                value={purchaseForm.occurred_at}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, occurred_at: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-1 min-w-[200px] flex-col gap-1.5">
              <label htmlFor="purchase-description" className="text-sm font-medium text-black dark:text-white">
                Descrição
              </label>
              <input
                id="purchase-description"
                type="text"
                required
                placeholder="Ex: compra de estoque"
                value={purchaseForm.description}
                onChange={(e) => setPurchaseForm((f) => ({ ...f, description: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="purchase-value" className="text-sm font-medium text-black dark:text-white">
                Valor
              </label>
              <input
                id="purchase-value"
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
            <p className="text-sm text-body dark:text-bodydark">Nenhuma compra lançada.</p>
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
    </div>
  );
}
