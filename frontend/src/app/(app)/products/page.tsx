'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { triggerMercadoLivreSync } from '@/services/accounts';
import { listProducts, refreshProductPrices } from '@/services/products';
import type { ProductSortColumn } from '@/services/products';
import type { Product } from '@/types/product';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getCurrentMonthRange } from '@/utils/dateRange';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'under_review', label: 'Em revisão' },
  { value: 'inactive', label: 'Inativo' },
];

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  under_review: 'Em revisão',
  inactive: 'Inativo',
};

const DEPOSIT_LABELS: Record<string, string> = {
  full: 'FULL',
  loja: 'LOJA',
};

const DEPOSIT_COLORS: Record<string, string> = {
  full: 'bg-success/10 text-success',
};

function depositKey(logisticType: string | null) {
  return logisticType === 'fulfillment' ? 'full' : 'loja';
}

const inputClass =
  'rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const inputStyle = { paddingLeft: 16 };

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  }).format(value);
}

function formatMoneyOrDash(value: number | null, currency: string | null) {
  if (value === null) return '—';
  return formatCurrency(value, currency);
}

export default function ProductsPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [sortBy, setSortBy] = useState<ProductSortColumn | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate);
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingPrices, setIsRefreshingPrices] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    triggerMercadoLivreSync(selectedAccountId, token);
    setIsLoading(true);
    try {
      const response = await listProducts(selectedAccountId, token, {
        status,
        search,
        sortBy,
        sortDir,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        perPage: 5000,
        page,
      });
      setProducts(response.data);
      setMeta(response.meta);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, status, search, sortBy, sortDir, startDate, endDate, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleRefreshPrices() {
    if (!selectedAccountId || !token) return;
    setIsRefreshingPrices(true);
    try {
      await refreshProductPrices(selectedAccountId, token);
      await loadProducts();
    } finally {
      setIsRefreshingPrices(false);
    }
  }

  function handleSort(column: ProductSortColumn) {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setPage(1);
  }

  function sortIndicator(column: ProductSortColumn) {
    if (sortBy !== column) return '';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  }

  function SortableHeader({
    column,
    label,
    align = 'left',
    width,
  }: {
    column: ProductSortColumn;
    label: string;
    align?: 'left' | 'center';
    width?: string;
  }) {
    return (
      <th className={`px-4 py-4 font-medium text-black dark:text-white ${width ?? ''}`}>
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Produtos</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Anúncios sincronizados do Mercado Livre.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search" className="text-sm font-medium text-black dark:text-white">
            Buscar
          </label>
          <input
            id="search"
            type="text"
            placeholder="Título do produto"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
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
        <button
          type="button"
          disabled={isRefreshingPrices}
          onClick={handleRefreshPrices}
          className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black disabled:opacity-60 dark:border-strokedark dark:text-white"
        >
          {isRefreshingPrices ? 'Atualizando...' : 'Atualizar preços'}
        </button>
      </div>

      {isLoading && products.length === 0 ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando produtos...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-body dark:text-bodydark">Nenhum produto encontrado.</p>
      ) : (
        <div className="scrollbar-visible max-h-[70vh] overflow-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
          <table className="w-full table-auto border-separate border-spacing-x-3 border-spacing-y-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-2 text-center dark:bg-meta-4">
                <th className="w-16 px-4 py-4"></th>
                <SortableHeader column="title" label="Nome" />
                <SortableHeader column="completed_sales_count" label="Vendas concluídas" align="center" />
                <th className="px-4 py-4 font-medium text-black dark:text-white">Cód. anúncio</th>
                <th className="w-24 px-4 py-4 text-center font-medium text-black dark:text-white">
                  Depósito
                </th>
                <SortableHeader column="seller_sku" label="SKU" align="center" width="w-[100px]" />
                <SortableHeader column="price" label="Preço" />
                <SortableHeader column="price" label="Preço atual" />
                <SortableHeader column="net_amount" label="Recebe" />
                <SortableHeader column="available_quantity" label="Estoque" align="center" />
                <SortableHeader column="status" label="Status" align="center" />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                    {product.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={product.thumbnail}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                    )}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <a
                      href={product.permalink ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-black hover:text-primary dark:text-white"
                    >
                      {product.title}
                    </a>
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-center text-black dark:border-strokedark dark:text-white">
                    {product.completed_sales_count}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-body dark:border-strokedark dark:text-bodydark">
                    {product.mercadolivre_item_id}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
                    <StatusBadge
                      status={depositKey(product.logistic_type)}
                      labels={DEPOSIT_LABELS}
                      colors={DEPOSIT_COLORS}
                    />
                  </td>
                  <td className="w-[100px] max-w-[100px] break-all border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                    {product.seller_sku ?? '—'}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatCurrency(product.price, product.currency)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatCurrency(product.price, product.currency)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
                    {formatMoneyOrDash(product.net_amount, product.currency)}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-center text-black dark:border-strokedark dark:text-white">
                    {product.available_quantity}
                  </td>
                  <td className="border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
                    <StatusBadge status={product.status} labels={STATUS_LABELS} />
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
