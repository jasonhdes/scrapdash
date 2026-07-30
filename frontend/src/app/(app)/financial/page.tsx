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
import { BRASILIA_TIMEZONE, formatReleaseDate } from '@/utils/format';
import listStyles from '@/styles/list.module.css';
import dashStyles from '@/styles/dashboard.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'refunded', label: 'Reembolsado' },
  { value: 'rejected', label: 'Rejeitado' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'in_mediation', label: 'Em mediação' },
];

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
    <div className={listStyles.container}>
      <div className={listStyles.header}>
        <div>
          <h1 className={listStyles.title}>Financeiro</h1>
          <p className={listStyles.subtitle}>Extrato de pagamentos e conciliação com pedidos.</p>
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
        <p className={listStyles.subtitle}>Carregando dados financeiros...</p>
      ) : summary ? (
        <>
          <div className={dashStyles.grid}>
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

          <div className={listStyles.section}>
            <h2 className={listStyles.title} style={{ fontSize: '1.1rem' }}>
              Por método de pagamento
            </h2>
            <div className={listStyles.tableWrapper}>
              <table className={listStyles.table}>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Quantidade</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(summary.by_method).map(([method, row]) => (
                    <tr key={method}>
                      <td>{method}</td>
                      <td>{row.total}</td>
                      <td>{formatCurrency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={listStyles.section}>
            <h2 className={listStyles.title} style={{ fontSize: '1.1rem' }}>
              Conciliação — pedidos pagos com valor divergente do aprovado
            </h2>
            {reconciliation.length === 0 ? (
              <p className={listStyles.subtitle}>Nenhuma divergência encontrada. ✓</p>
            ) : (
              <div className={listStyles.tableWrapper}>
                <table className={listStyles.table}>
                  <thead>
                    <tr>
                      <th>Pedido</th>
                      <th>Data</th>
                      <th>Valor do pedido</th>
                      <th>Aprovado</th>
                      <th>Diferença</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reconciliation.map((row) => (
                      <tr key={row.order_id}>
                        <td>
                          <Link href={`/orders/${row.order_id}`} className={listStyles.link}>
                            {row.mercadolivre_order_id}
                          </Link>
                        </td>
                        <td>{formatDate(row.ordered_at)}</td>
                        <td>{formatCurrency(row.order_total)}</td>
                        <td>{formatCurrency(row.approved_amount)}</td>
                        <td style={{ color: 'var(--color07)' }}>
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

      <div className={listStyles.section}>
        <h2 className={listStyles.title} style={{ fontSize: '1.1rem' }}>
          Extrato de pagamentos
        </h2>

        <div className={listStyles.filters}>
          <div className={listStyles.field}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={listStyles.field}>
            <label htmlFor="payment_method">Método</label>
            <input
              id="payment_method"
              type="text"
              placeholder="pix, visa, master..."
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {payments.length === 0 ? (
          <p className={listStyles.subtitle}>Nenhum pagamento encontrado.</p>
        ) : (
          <div className={listStyles.tableWrapper}>
            <table className={listStyles.table}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Status</th>
                  <th>Valor</th>
                  <th>Método</th>
                  <th>Data</th>
                  <th>Liberação</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      {payment.order ? (
                        <Link href={`/orders/${payment.order.id}`} className={listStyles.link}>
                          {payment.order.mercadolivre_order_id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={listStyles.badge}>{payment.status}</span>
                    </td>
                    <td>{formatCurrency(payment.transaction_amount)}</td>
                    <td>{payment.payment_method ?? '—'}</td>
                    <td>{formatDate(payment.paid_at)}</td>
                    <td>{formatReleaseDate(payment.money_release_date, payment.released)}</td>
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
