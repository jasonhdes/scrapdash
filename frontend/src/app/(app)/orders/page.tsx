'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { exportOrdersCsv, getSkuOptions, listOrders, markOrderProcessed } from '@/services/orders';
import type { OrderSortColumn, SkuOption } from '@/services/orders';
import type { Order } from '@/types/order';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BRASILIA_TIMEZONE, formatReleaseDate } from '@/utils/format';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'paid', label: 'Pago' },
  { value: 'cancelled', label: 'Cancelado' },
  { value: 'partially_refunded', label: 'Parcialmente reembolsado' },
];

const PROCESSED_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '0', label: 'Não processados' },
  { value: '1', label: 'Processados' },
];

const RELEASED_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: '1', label: 'Liberado' },
  { value: '0', label: 'Pendente' },
];

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
  return new Date(value).toLocaleString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

function formatLocation(city: string | null, state: string | null) {
  if (!city && !state) return '—';
  if (city && state) return `${city}/${state}`;
  return city ?? state ?? '—';
}

export default function OrdersPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [textFiltersInput, setTextFiltersInput] = useState(EMPTY_TEXT_FILTERS);
  const [textFilters, setTextFilters] = useState(EMPTY_TEXT_FILTERS);
  const [status, setStatus] = useState('');
  const [released, setReleased] = useState('');
  const [processed, setProcessed] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [sortBy, setSortBy] = useState<OrderSortColumn | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTextFilters(textFiltersInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [textFiltersInput]);

  useEffect(() => {
    if (!selectedAccountId || !token) return;
    getSkuOptions(selectedAccountId, token).then(({ data }) => setSkuOptions(data));
  }, [selectedAccountId, token]);

  const filters = {
    orderNumber: textFilters.orderNumber || undefined,
    buyer: textFilters.buyer || undefined,
    product: textFilters.product || undefined,
    skus: selectedSkus.length > 0 ? selectedSkus : undefined,
    location: textFilters.location || undefined,
    minTotal: textFilters.minTotal || undefined,
    maxTotal: textFilters.maxTotal || undefined,
    status: status || undefined,
    released: released === '' ? undefined : released === '1',
    processed: processed === '' ? undefined : processed === '1',
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortDir,
    page,
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
    selectedSkus,
    status,
    released,
    processed,
    startDate,
    endDate,
    sortBy,
    sortDir,
    page,
  ]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleToggleProcessed(order: Order) {
    if (!selectedAccountId || !token) return;
    setUpdatingId(order.id);
    try {
      await markOrderProcessed(selectedAccountId, order.id, !order.processed_at, token);
      await loadOrders();
    } finally {
      setUpdatingId(null);
    }
  }

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
    setProcessed('');
    setStartDate('');
    setEndDate('');
    setSelectedSkus([]);
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
          <label htmlFor="skus" className="text-sm font-medium text-black dark:text-white">
            SKU (selecione um ou mais)
          </label>
          <select
            id="skus"
            multiple
            size={4}
            value={selectedSkus}
            onChange={(e) => {
              setSelectedSkus(Array.from(e.target.selectedOptions, (o) => o.value));
              setPage(1);
            }}
            style={inputStyle}
            className={`${inputClass} min-w-48`}
          >
            {skuOptions.map((option) => (
              <option key={option.sku} value={option.sku}>
                {option.sku} — {option.title}
              </option>
            ))}
          </select>
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="processed" className="text-sm font-medium text-black dark:text-white">
            Processamento
          </label>
          <select
            id="processed"
            value={processed}
            onChange={(e) => {
              setProcessed(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
            className={inputClass}
          >
            {PROCESSED_OPTIONS.map((option) => (
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
            setStartDate('');
            setEndDate('');
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
        <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th
                  className="cursor-pointer whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white"
                  onClick={() => handleSort('mercadolivre_order_id')}
                >
                  Pedido{sortIndicator('mercadolivre_order_id')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white"
                  onClick={() => handleSort('buyer_nickname')}
                >
                  Comprador{sortIndicator('buyer_nickname')}
                </th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Cidade/Estado</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Produtos</th>
                <th
                  className="cursor-pointer whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white"
                  onClick={() => handleSort('total_amount')}
                >
                  Valor{sortIndicator('total_amount')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white"
                  onClick={() => handleSort('status')}
                >
                  Status{sortIndicator('status')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white"
                  onClick={() => handleSort('ordered_at')}
                >
                  Data{sortIndicator('ordered_at')}
                </th>
                <th
                  className="cursor-pointer whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white"
                  onClick={() => handleSort('money_release_date')}
                >
                  Liberação{sortIndicator('money_release_date')}
                </th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Processado</th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <Link href={`/orders/${order.id}`} className="font-medium text-primary">
                      {order.mercadolivre_order_id}
                    </Link>
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {order.buyer_nickname ?? '—'}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatLocation(order.buyer_city, order.buyer_state)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-sm text-body dark:border-strokedark dark:text-bodydark">
                    {order.items && order.items.length > 0
                      ? order.items.map((item) => (
                          <div key={item.id}>
                            {item.title} {item.seller_sku ? `(SKU: ${item.seller_sku})` : ''} x
                            {item.quantity}
                          </div>
                        ))
                      : '—'}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatCurrency(order.total_amount, order.currency)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatDate(order.ordered_at)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {formatReleaseDate(order.money_release_date, order.money_released)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {order.processed_at ? 'Sim' : 'Não'}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <button
                      disabled={updatingId === order.id}
                      onClick={() => handleToggleProcessed(order)}
                      className={buttonClass}
                    >
                      {order.processed_at ? 'Desmarcar' : 'Marcar processado'}
                    </button>
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
