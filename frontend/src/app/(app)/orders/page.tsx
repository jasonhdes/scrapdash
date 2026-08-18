'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { exportOrdersCsv, listOrders } from '@/services/orders';
import type { OrderSortColumn } from '@/services/orders';
import type { Order } from '@/types/order';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { Pagination } from '@/components/shared/Pagination';
import { BRASILIA_TIMEZONE } from '@/utils/format';
import { getCurrentMonthRange } from '@/utils/dateRange';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'paid', label: 'Pago' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'partially_refunded', label: 'Parcialmente reembolsado' },
];

const RELEASED_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '1', label: 'Liberado' },
  { value: '0', label: 'Pendente' },
];

const RELEASE_BADGE_COLORS: Record<
  'received' | 'pending' | 'today' | 'late' | 'cancelled' | 'mediation',
  string
> = {
  received: 'bg-success/10 text-success',
  pending: 'bg-warning/10 text-warning',
  today: 'bg-meta-5/10 text-meta-5',
  late: 'bg-danger/10 text-danger',
  cancelled: 'bg-danger/10 text-danger',
  mediation: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
};

function dateKey(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: BRASILIA_TIMEZONE });
}

function releaseCell(
  status: string | null,
  inMediation: boolean | undefined,
  releaseDate: string | null,
  released: boolean | null | undefined,
) {
  if (status === 'cancelled') {
    return { key: 'cancelled' as const, text: 'Cancelado' };
  }

  if (inMediation) {
    return { key: 'mediation' as const, text: 'Em mediação' };
  }

  if (!releaseDate) return null;

  const date = new Date(releaseDate);
  const formatted = date.toLocaleDateString('pt-BR', { timeZone: BRASILIA_TIMEZONE });

  if (released) {
    return { key: 'received' as const, text: `${formatted} — Recebido` };
  }

  const releaseDay = dateKey(date);
  const today = dateKey(new Date());

  if (releaseDay === today) {
    return { key: 'today' as const, text: `${formatted} — Hoje` };
  }

  return releaseDay < today
    ? { key: 'late' as const, text: `${formatted} — Atrasado` }
    : { key: 'pending' as const, text: `${formatted} — Aguardando` };
}

const EMPTY_TEXT_FILTERS = {
  orderNumber: '',
  buyer: '',
  product: '',
  location: '',
  minTotal: '',
  maxTotal: '',
};

const inputClass =
  'rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const inputStyle = { paddingLeft: 16 };
const buttonClass =
  'rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black dark:border-strokedark dark:text-white';

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

function formatMoneyOrDash(value: number | null | undefined, currency: string | null) {
  if (value === null || value === undefined) return '—';
  return formatCurrency(value, currency);
}

export default function OrdersPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [textFiltersInput, setTextFiltersInput] = useState(EMPTY_TEXT_FILTERS);
  const [textFilters, setTextFilters] = useState(EMPTY_TEXT_FILTERS);
  const [status, setStatus] = useState('');
  const [released, setReleased] = useState('');
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate);
  const [sortBy, setSortBy] = useState<OrderSortColumn | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTextFilters(textFiltersInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [textFiltersInput]);

  const filters = {
    orderNumber: textFilters.orderNumber || undefined,
    buyer: textFilters.buyer || undefined,
    product: textFilters.product || undefined,
    location: textFilters.location || undefined,
    minTotal: textFilters.minTotal || undefined,
    maxTotal: textFilters.maxTotal || undefined,
    status: status || undefined,
    released: released === '' ? undefined : released === '1',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortDir,
    page,
    perPage: startDate || endDate ? 5000 : undefined,
  };

  const loadOrders = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const response = await listOrders(selectedAccountId, token, filters);
      setOrders(response.data);
      setMeta(response.meta);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedAccountId,
    token,
    textFilters,
    status,
    released,
    startDate,
    endDate,
    sortBy,
    sortDir,
    page,
  ]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleExport() {
    if (!selectedAccountId || !token) return;
    setIsExporting(true);
    try {
      await exportOrdersCsv(selectedAccountId, token, filters);
    } finally {
      setIsExporting(false);
    }
  }

  function clearFilters() {
    setTextFiltersInput(EMPTY_TEXT_FILTERS);
    setStatus('');
    setReleased('');
    setStartDate(getCurrentMonthRange().startDate);
    setEndDate(getCurrentMonthRange().endDate);
    setSortBy(undefined);
    setSortDir('desc');
    setPage(1);
  }

  function handleSort(column: OrderSortColumn) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  }

  function sortIndicator(column: OrderSortColumn) {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  function SortableHeader({
    column,
    label,
    align = 'left',
    width,
  }: {
    column: OrderSortColumn;
    label: string;
    align?: 'left' | 'center';
    width?: string;
  }) {
    return (
      <th className={`whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white ${width ?? ''}`}>
        <button
          type="button"
          onClick={() => handleSort(column)}
          className={`flex items-center gap-1 font-medium hover:text-primary ${align === 'center' ? 'mx-auto' : ''}`}
        >
          {label}
          {sortIndicator(column)}
        </button>
      </th>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Pedidos</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Pedidos sincronizados do Mercado Livre.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="order_number" className="text-sm font-medium text-black dark:text-white">
            Pedido
          </label>
          <input
            id="order_number"
            type="text"
            placeholder="Número do pedido"
            value={textFiltersInput.orderNumber}
            onChange={(e) => setTextFiltersInput((f) => ({ ...f, orderNumber: e.target.value }))}
            style={inputStyle}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="buyer" className="text-sm font-medium text-black dark:text-white">
            Comprador
          </label>
          <input
            id="buyer"
            type="text"
            placeholder="Apelido do comprador"
            value={textFiltersInput.buyer}
            onChange={(e) => setTextFiltersInput((f) => ({ ...f, buyer: e.target.value }))}
            style={inputStyle}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="location" className="text-sm font-medium text-black dark:text-white">
            Cidade/Estado
          </label>
          <input
            id="location"
            type="text"
            placeholder="Ex.: São Paulo"
            value={textFiltersInput.location}
            onChange={(e) => setTextFiltersInput((f) => ({ ...f, location: e.target.value }))}
            style={inputStyle}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="product" className="text-sm font-medium text-black dark:text-white">
            Produto
          </label>
          <input
            id="product"
            type="text"
            placeholder="Nome do produto"
            value={textFiltersInput.product}
            onChange={(e) => setTextFiltersInput((f) => ({ ...f, product: e.target.value }))}
            style={inputStyle}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="min_total" className="text-sm font-medium text-black dark:text-white">
            Valor mín.
          </label>
          <input
            id="min_total"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={textFiltersInput.minTotal}
            onChange={(e) => setTextFiltersInput((f) => ({ ...f, minTotal: e.target.value }))}
            style={inputStyle}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="max_total" className="text-sm font-medium text-black dark:text-white">
            Valor máx.
          </label>
          <input
            id="max_total"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={textFiltersInput.maxTotal}
            onChange={(e) => setTextFiltersInput((f) => ({ ...f, maxTotal: e.target.value }))}
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
          <label htmlFor="released" className="text-sm font-medium text-black dark:text-white">
            Liberação
          </label>
          <select
            id="released"
            value={released}
            onChange={(e) => {
              setReleased(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
            className={inputClass}
          >
            {RELEASED_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
        <button onClick={clearFilters} className={buttonClass}>
          Limpar filtros
        </button>
        <button disabled={isExporting} onClick={handleExport} className={buttonClass}>
          {isExporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {isLoading && orders.length === 0 ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando pedidos...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-body dark:text-bodydark">Nenhum pedido encontrado.</p>
      ) : (
        <div className="scrollbar-visible max-h-[70vh] overflow-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
          <table className="w-full table-auto border-separate border-spacing-x-3 border-spacing-y-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <SortableHeader column="mercadolivre_order_id" label="Pedido" />
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">SKU</th>
                <SortableHeader column="total_amount" label="Valor anúncio" />
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Valor pago
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Taxa ML
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Taxa processamento
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Taxa envio
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Taxa financiamento
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Cupom
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Valor líquido
                </th>
                <SortableHeader column="ordered_at" label="Data venda" />
                <SortableHeader column="money_release_date" label="Data liberação" />
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  className="odd:bg-white even:bg-gray-2 hover:bg-gray dark:odd:bg-boxdark dark:even:bg-meta-4/40 dark:hover:bg-meta-4"
                >
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <Link href={`/orders/${order.id}`} className="font-medium text-primary">
                      {order.mercadolivre_order_id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-sm text-body dark:border-strokedark dark:text-bodydark">
                    {order.items && order.items.length > 0
                      ? order.items.map((item) => <div key={item.id}>{item.seller_sku ?? '—'}</div>)
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatCurrency(order.total_amount, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatMoneyOrDash(order.paid_amount, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatMoneyOrDash(order.ml_fee, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatMoneyOrDash(order.mp_processing_fee, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatMoneyOrDash(order.shipping_fee, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatMoneyOrDash(order.financing_fee, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatMoneyOrDash(order.coupon_amount, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 font-medium text-black dark:border-strokedark dark:text-white">
                    {formatMoneyOrDash(order.net_received_amount, order.currency)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatDate(order.ordered_at)}
                  </td>
                  <td className="whitespace-nowrap border-b border-stroke px-4 py-3 dark:border-strokedark">
                    {(() => {
                      const info = releaseCell(
                        order.status,
                        order.in_mediation,
                        order.money_release_date,
                        order.money_released,
                      );
                      if (!info) {
                        return <span className="text-body dark:text-bodydark">—</span>;
                      }
                      return (
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${RELEASE_BADGE_COLORS[info.key]}`}
                        >
                          {info.text}
                        </span>
                      );
                    })()}
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
  );
}
