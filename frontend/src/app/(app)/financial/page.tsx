'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { listPayments, getFinancialSummary, getReconciliation } from '@/services/financial';
import type { FinancialSummary, PaymentWithOrder, ReconciliationRow } from '@/types/financial';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BRASILIA_TIMEZONE, formatReleaseDate } from '@/utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'refunded', label: 'Reembolsado' },
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

export default function FinancialPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [page, setPage] = useState(1);

  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationRow[]>([]);
  const [payments, setPayments] = useState<PaymentWithOrder[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const [summaryRes, reconciliationRes, paymentsRes] = await Promise.all([
        getFinancialSummary(selectedAccountId, token, startDate || undefined, endDate || undefined),
        getReconciliation(selectedAccountId, token),
        listPayments(selectedAccountId, token, {
          status: status || undefined,
          paymentMethod: paymentMethod || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          page,
        }),
      ]);
      setSummary(summaryRes);
      setReconciliation(reconciliationRes.data);
      setPayments(paymentsRes.data);
      setMeta(paymentsRes.meta);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, startDate, endDate, status, paymentMethod, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Financeiro</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Extrato de pagamentos e conciliação com pedidos.
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
          setStartDate('');
          setEndDate('');
          setPage(1);
        }}
      />

      {isLoading && !summary ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando dados financeiros...</p>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Total recebido" value={formatCurrency(summary.total_received)} />
            {Object.entries(summary.by_status).map(([statusKey, row]) => (
              <KpiCard
                key={statusKey}
                label={STATUS_OPTIONS.find((o) => o.value === statusKey)?.label ?? statusKey}
                value={formatCurrency(row.amount)}
                hint={`${row.total} pagamento(s)`}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Por método de pagamento
            </h2>
            <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Método</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Quantidade</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.by_method).map(([method, row]) => (
                    <tr key={method}>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {method}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {row.total}
                      </td>
                      <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-black dark:text-white">
              Conciliação — pedidos pagos com valor divergente do aprovado
            </h2>
            {reconciliation.length === 0 ? (
              <p className="text-sm text-body dark:text-bodydark">
                Nenhuma divergência encontrada. ✓
              </p>
            ) : (
              <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
                <table className="w-full table-auto">
                  <thead>
                    <tr className="bg-gray-2 text-left dark:bg-meta-4">
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Pedido</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Data</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">
                        Valor do pedido
                      </th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">Aprovado</th>
                      <th className="px-4 py-4 font-medium text-black dark:text-white">
                        Diferença
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.map((row) => (
                      <tr key={row.order_id}>
                        <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                          <Link
                            href={`/orders/${row.order_id}`}
                            className="font-medium text-primary"
                          >
                            {row.mercadolivre_order_id}
                          </Link>
                        </td>
                        <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                          {formatDate(row.ordered_at)}
                        </td>
                        <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                          {formatCurrency(row.order_total)}
                        </td>
                        <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                          {formatCurrency(row.approved_amount)}
                        </td>
                        <td className="border-b border-stroke px-4 py-3 font-medium text-danger dark:border-strokedark">
                          {formatCurrency(row.difference)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">Extrato de pagamentos</h2>

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
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="payment_method"
              className="text-sm font-medium text-black dark:text-white"
            >
              Método
            </label>
            <input
              id="payment_method"
              type="text"
              placeholder="pix, visa, master..."
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
              style={inputStyle}
              className={inputClass}
            />
          </div>
        </div>

        {payments.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhum pagamento encontrado.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-left dark:bg-meta-4">
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Pedido</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Valor</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Método</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Data</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Liberação</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                      {payment.order ? (
                        <Link
                          href={`/orders/${payment.order.id}`}
                          className="font-medium text-primary"
                        >
                          {payment.order.mercadolivre_order_id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                      <StatusBadge status={payment.status} />
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                      {formatCurrency(payment.transaction_amount)}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                      {payment.payment_method ?? '—'}
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
    </div>
  );
}
