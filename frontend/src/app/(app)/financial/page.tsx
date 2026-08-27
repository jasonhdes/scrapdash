'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { triggerMercadoLivreSync } from '@/services/accounts';
import { listPayments, setPaymentReleased } from '@/services/financial';
import type { PaymentSortColumn } from '@/services/financial';
import type { PaymentWithOrder } from '@/types/financial';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FinancialPeriodCards } from '@/components/financial/FinancialPeriodCards';
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
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [sortBy, setSortBy] = useState<PaymentSortColumn | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOrderId, setModalOrderId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    triggerMercadoLivreSync(selectedAccountId, token);
    setIsLoading(true);
    try {
      const paymentsRes = await listPayments(selectedAccountId, token, {
        status: status || undefined,
        orderNumber: orderNumber || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        sortBy,
        sortDir,
        perPage: 5000,
      });
      setPayments(paymentsRes.data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, startDate, endDate, status, orderNumber, sortBy, sortDir]);

  useEffect(() => {
    const timeout = setTimeout(() => setOrderNumber(orderNumberInput), 400);
    return () => clearTimeout(timeout);
  }, [orderNumberInput]);

  async function handleToggleReleased(paymentId: number, current: boolean | null) {
    if (!selectedAccountId || !token) return;
    const next = !current;
    // Otimista: a linha muda na hora, sem esperar o round-trip.
    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, released: next } : p)),
    );
    await setPaymentReleased(selectedAccountId, token, paymentId, next);
  }

  function handleSort(column: PaymentSortColumn) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  }

  function sortIndicator(column: PaymentSortColumn) {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  function SortableHeader({ column, label }: { column: PaymentSortColumn; label: string }) {
    return (
      <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
        <button
          type="button"
          onClick={() => handleSort(column)}
          className="mx-auto flex items-center gap-1 font-medium hover:text-primary"
        >
          {label}
          {sortIndicator(column)}
        </button>
      </th>
    );
  }

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
        }}
        onClear={() => {
          setStartDate(getCurrentMonthRange().startDate);
          setEndDate(getCurrentMonthRange().endDate);
        }}
      />

      <FinancialPeriodCards accountId={selectedAccountId} token={token} />

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">Lista de pedidos</h2>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="order-number" className="text-sm font-medium text-black dark:text-white">
              Número do pedido
            </label>
            <input
              id="order-number"
              type="text"
              placeholder="Buscar pedido..."
              value={orderNumberInput}
              onChange={(e) => setOrderNumberInput(e.target.value)}
              style={inputStyle}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="status" className="text-sm font-medium text-black dark:text-white">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
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

        {isLoading && payments.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando pedidos...</p>
        ) : payments.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhum pagamento encontrado.</p>
        ) : (
          <div className="scrollbar-visible max-h-[70vh] overflow-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-2 text-center dark:bg-meta-4">
                  <SortableHeader column="mercadolivre_order_id" label="Pedido" />
                  <SortableHeader column="status" label="Status" />
                  <SortableHeader column="net_received_amount" label="Valor líquido" />
                  <SortableHeader column="paid_at" label="Data" />
                  <SortableHeader column="money_release_date" label="Liberação" />
                  <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                    Liberado
                  </th>
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
                    <td className="border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
                      <input
                        type="checkbox"
                        checked={!!payment.released}
                        onChange={() => handleToggleReleased(payment.id, payment.released)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOrderId && selectedAccountId && token && (
        <OrderDetailModal
          accountId={selectedAccountId}
          token={token}
          orderId={modalOrderId}
          onClose={() => setModalOrderId(null)}
        />
      )}
    </div>
  );
}
