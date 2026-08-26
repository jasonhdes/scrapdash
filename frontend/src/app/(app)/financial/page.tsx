'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { triggerMercadoLivreSync } from '@/services/accounts';
import { listPayments, getFinancialSummary } from '@/services/financial';
import type { FinancialSummary, PaymentWithOrder } from '@/types/financial';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FinancialBalanceSection } from '@/components/financial/FinancialBalanceSection';
import { OrderDetailModal } from '@/components/financial/OrderDetailModal';
import { BRASILIA_TIMEZONE, formatReleaseDate } from '@/utils/format';
import { getCurrentMonthRange } from '@/utils/dateRange';
import { PAYMENT_STATUS_LABELS } from '@/utils/paymentStatus';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'refunded', label: 'Venda cancelada' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'in_mediation', label: 'Em mediação' },
];

const inputClass =
  'rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const inputStyle = { paddingLeft: 16 };

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

function formatMoneyOrDash(value: number | null) {
  if (value === null) return '—';
  return formatCurrency(value);
}

export default function FinancialPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [modalOrderId, setModalOrderId] = useState<number | null>(null);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);

  const loadData = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    triggerMercadoLivreSync(selectedAccountId, token);
    setIsLoading(true);
    try {
      const [summaryRes, paymentsRes] = await Promise.all([
        getFinancialSummary(selectedAccountId, token, startDate || undefined, endDate || undefined),
        listPayments(selectedAccountId, token, {
          status: status || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
        }),
      ]);
      setSummary(summaryRes);
      setPayments(paymentsRes.data);
      setMeta(paymentsRes.meta);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, startDate, endDate, status, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Financeiro</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Visão financeira e lista de pedidos com seus valores líquidos.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onChange={({ startDate: s, endDate: e }) => {
          setStartDate(s);
          setEndDate(e);
          setPage(1);
        }}
        onClear={() => {
          setStartDate(getCurrentMonthRange().startDate);
          setEndDate(getCurrentMonthRange().endDate);
          setPage(1);
        }}
      />

      <FinancialBalanceSection
        accountId={selectedAccountId}
        token={token}
        refreshKey={balanceRefreshKey}
      />

      {isLoading && !summary ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando dados financeiros...</p>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total líquido"
              value={formatCurrency(summary.total_net)}
              className="sm:col-span-2"
            />
            <KpiCard label="Total bruto" value={formatCurrency(summary.total_gross)} />
            <KpiCard
              label="Total recebido"
              value={formatCurrency(summary.total_received.amount)}
              hint={`${summary.total_received.total} pagamento(s)`}
            />
            <KpiCard
              label="A receber"
              value={formatCurrency(summary.pending_receivable.amount)}
              hint={`${summary.pending_receivable.total} pagamento(s)`}
            />
            <KpiCard
              label="Vendas canceladas"
              value={formatCurrency(summary.cancelled_sales.amount)}
              hint={`${summary.cancelled_sales.total} pagamento(s)`}
            />
            <KpiCard
              label="Valor retido"
              value={formatCurrency(summary.held_value.amount)}
              hint={`${summary.held_value.total} pagamento(s)`}
            />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">Lista de pedidos</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-sm font-medium text-black dark:text-white">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              style={inputStyle}
              className={inputClass}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhum pagamento encontrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-center dark:bg-meta-4">
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Pedido</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Valor líquido</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Data</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Liberação</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                      {payment.order ? (
                        <button
                          type="button"
                          onClick={() => setModalOrderId(payment.order!.id)}
                          className="font-medium text-primary hover:underline"
                        >
                          {payment.order.mercadolivre_order_id}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                      <StatusBadge status={payment.status} labels={PAYMENT_STATUS_LABELS} />
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                      {formatMoneyOrDash(payment.net_received_amount)}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                      {formatDate(payment.paid_at)}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                      {formatReleaseDate(payment.money_release_date, payment.released)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={meta.current_page}
          lastPage={meta.last_page}
          total={meta.total}
          onChange={setPage}
        />
      </div>

      {modalOrderId && selectedAccountId && token && (
        <OrderDetailModal
          accountId={selectedAccountId}
          token={token}
          orderId={modalOrderId}
          onClose={() => {
            setModalOrderId(null);
            setBalanceRefreshKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
