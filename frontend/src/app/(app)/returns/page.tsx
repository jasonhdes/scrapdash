'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { triggerMercadoLivreSync } from '@/services/accounts';
import { listOrders } from '@/services/orders';
import type { Order } from '@/types/order';
import {
  createReturn,
  deleteReturn,
  getReturnsSummary,
  listReturns,
  setReturnVerified,
  syncReturns,
} from '@/services/returns';
import type { OrderReturn, OrderReturnGroup, OrderReturnStatus, OrderReturnSummary } from '@/types/orderReturn';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Pagination } from '@/components/shared/Pagination';
import { BRASILIA_TIMEZONE } from '@/utils/format';
import { getCurrentMonthRange } from '@/utils/dateRange';
import { RETURN_STATUS_BADGE_COLORS, RETURN_STATUS_LABELS } from '@/utils/returnStatus';

const STATUS_OPTIONS: { value: OrderReturnStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'pecas_devolvidas', label: 'Peças devolvidas' },
  { value: 'comprou_cancelou', label: 'Comprou e cancelou' },
  { value: 'valor_retido', label: 'Valor retido' },
  { value: 'estorno_valor', label: 'Estorno de valor' },
  { value: 'desconto_venda', label: 'Desconto de venda' },
  { value: 'desconto_frete', label: 'Desconto de frete' },
];

const STATUS_LABELS = RETURN_STATUS_LABELS;

const STATUS_BADGE_COLORS = RETURN_STATUS_BADGE_COLORS;

const EMPTY_FORM = {
  status: 'desconto_venda' as OrderReturnStatus,
  occurred_at: '',
  buyer_name: '',
  value: '',
  product_name: '',
};

type OrderLookupStatus = 'idle' | 'loading' | 'found' | 'not_found';

type SortColumn =
  | 'verified'
  | 'order'
  | 'ordered_at'
  | 'sku'
  | 'buyer_name'
  | 'product_name'
  | 'status'
  | 'updated_at'
  | 'value';

// Cada grupo pode ter várias linhas de histórico (status diferentes ao
// longo do tempo) — pra ordenar a lista por uma coluna "por linha" (status,
// data da atualização, valor, conferido), usa a entrada mais recente do
// histórico do pedido, que é a que aparece emparelhada com o cabeçalho.
function sortValue(group: OrderReturnGroup, column: SortColumn): string | number {
  const first = group.history[0] as OrderReturn | undefined;
  switch (column) {
    case 'verified':
      return first?.verified ? 1 : 0;
    case 'order':
      return group.mercadolivre_order_id ?? '';
    case 'ordered_at':
      return group.ordered_at ?? '';
    case 'sku':
      return group.sku ?? '';
    case 'buyer_name':
      return group.buyer_name ?? '';
    case 'product_name':
      return group.product_name ?? '';
    case 'status':
      return first ? STATUS_LABELS[first.status] : '';
    case 'updated_at':
      return first?.occurred_at ?? '';
    case 'value':
      return first?.value ?? 0;
    default:
      return '';
  }
}

function orderProductName(order: Order) {
  return order.items?.map((item) => item.title).filter(Boolean).join(', ') || null;
}

function orderSku(order: Order) {
  return order.items?.map((item) => item.seller_sku).filter(Boolean).join(', ') || null;
}

function SortableHeader({
  column,
  label,
  sortColumn,
  sortDirection,
  onSort,
  className = '',
}: {
  column: SortColumn;
  label: string;
  sortColumn: SortColumn | null;
  sortDirection: 'asc' | 'desc';
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const active = sortColumn === column;

  return (
    <th
      onClick={() => onSort(column)}
      title={`Ordenar por ${label}`}
      className={`cursor-pointer select-none px-4 py-4 font-medium text-black hover:text-primary dark:text-white ${className}`}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-[10px] ${active ? 'text-primary' : 'text-body dark:text-bodydark'}`}>
          {active ? (sortDirection === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </span>
    </th>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15V5a1.5 1.5 0 0 1 1.5-1.5H15" strokeLinecap="round" />
    </svg>
  );
}

const inputClass =
  'rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const inputStyle = { paddingLeft: 16 };
const buttonClass =
  'rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black dark:border-strokedark dark:text-white';

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    timeZone: BRASILIA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDatePart(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('pt-BR', { timeZone: BRASILIA_TIMEZONE });
}

function formatTimePart(value: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString('pt-BR', {
    timeZone: BRASILIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Célula "apagada": mantém legível, mas visualmente recuada — sinaliza que
// aquela linha do histórico já foi conferida, sem esconder a informação.
const VERIFIED_ROW_CLASS = 'bg-gray-200 text-body dark:bg-meta-4/70 dark:text-bodydark';

export default function ReturnsPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [status, setStatus] = useState('');
  const [verified, setVerified] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate);
  const [page, setPage] = useState(1);

  const [groups, setGroups] = useState<OrderReturnGroup[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [summary, setSummary] = useState<OrderReturnSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [orderLookupStatus, setOrderLookupStatus] = useState<OrderLookupStatus>('idle');
  const [loadedOrder, setLoadedOrder] = useState<Order | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const filters = {
    status: status || undefined,
    verified: verified === '' ? undefined : verified === '1',
    search: search || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    perPage: 5000,
    page,
  };

  const load = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    triggerMercadoLivreSync(selectedAccountId, token);
    setIsLoading(true);
    try {
      const [listResponse, summaryResponse] = await Promise.all([
        listReturns(selectedAccountId, token, filters),
        getReturnsSummary(selectedAccountId, token, filters),
      ]);
      setGroups(listResponse.data);
      setMeta(listResponse.meta);
      setSummary(summaryResponse);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, token, status, verified, search, startDate, endDate, page]);

  useEffect(() => {
    load();
  }, [load]);

  // Ao digitar o número do pedido na "Nova entrada", busca o pedido pra
  // carregar comprador/produto/SKU automaticamente antes de liberar os
  // campos de status e valor — evita digitar tudo à mão de novo.
  useEffect(() => {
    if (!showForm) return;
    const trimmed = orderNumberInput.trim();
    if (!trimmed) {
      setOrderLookupStatus('idle');
      setLoadedOrder(null);
      return;
    }
    if (!selectedAccountId || !token) return;

    setOrderLookupStatus('loading');
    const timeout = setTimeout(async () => {
      try {
        const response = await listOrders(selectedAccountId, token, { orderNumber: trimmed, perPage: 5 });
        const match =
          response.data.find((o) => o.mercadolivre_order_id === trimmed) ??
          (response.data.length === 1 ? response.data[0] : null);

        if (match) {
          setLoadedOrder(match);
          setOrderLookupStatus('found');
          setManualMode(false);
        } else {
          setLoadedOrder(null);
          setOrderLookupStatus('not_found');
        }
      } catch {
        setLoadedOrder(null);
        setOrderLookupStatus('not_found');
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [orderNumberInput, showForm, selectedAccountId, token]);

  function resetForm() {
    setForm(EMPTY_FORM);
    setOrderNumberInput('');
    setOrderLookupStatus('idle');
    setLoadedOrder(null);
    setManualMode(false);
  }

  async function handleCopyOrderNumber(groupKey: string | number, orderNumber: string) {
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopiedKey(groupKey);
      setTimeout(() => setCopiedKey((current) => (current === groupKey ? null : current)), 1500);
    } catch {
      // Sem permissão de clipboard nesse navegador — ignora silenciosamente.
    }
  }

  // "+ Atualização": mesmo formulário de "+ Nova entrada", mas já abre com
  // o pedido carregado (ou comprador/produto pré-preenchidos, se o registro
  // não estiver vinculado a um pedido do ML) — evita redigitar o número.
  function handleEdit(group: OrderReturnGroup) {
    setShowForm(true);
    if (group.mercadolivre_order_id) {
      setManualMode(false);
      setForm(EMPTY_FORM);
      setOrderNumberInput(group.mercadolivre_order_id);
    } else {
      setManualMode(true);
      setOrderNumberInput('');
      setOrderLookupStatus('idle');
      setLoadedOrder(null);
      setForm({ ...EMPTY_FORM, buyer_name: group.buyer_name ?? '', product_name: group.product_name ?? '' });
    }
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }

  function handleSort(column: SortColumn) {
    if (sortColumn === column) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  }

  const sortedGroups = useMemo(() => {
    if (!sortColumn) return groups;
    const dir = sortDirection === 'asc' ? 1 : -1;
    return [...groups].sort((a, b) => {
      const va = sortValue(a, sortColumn);
      const vb = sortValue(b, sortColumn);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [groups, sortColumn, sortDirection]);

  async function handleSync() {
    if (!selectedAccountId || !token) return;
    setIsSyncing(true);
    try {
      await syncReturns(selectedAccountId, token);
      await load();
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleToggleVerified(groupKey: string | number, itemId: number, current: boolean) {
    if (!selectedAccountId || !token) return;
    setGroups((prev) =>
      prev.map((g) =>
        g.group_key !== groupKey
          ? g
          : { ...g, history: g.history.map((h) => (h.id === itemId ? { ...h, verified: !current } : h)) },
      ),
    );
    await setReturnVerified(selectedAccountId, token, itemId, !current);
  }

  async function handleDelete(itemId: number) {
    if (!selectedAccountId || !token) return;
    if (!confirm('Remover esse registro?')) return;
    await deleteReturn(selectedAccountId, token, itemId);
    await load();
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !token) return;
    setIsSaving(true);
    try {
      await createReturn(selectedAccountId, token, {
        status: form.status,
        occurred_at: form.occurred_at,
        buyer_name: loadedOrder ? (loadedOrder.buyer_nickname ?? undefined) : form.buyer_name || undefined,
        value: Number(form.value),
        product_name: loadedOrder ? (orderProductName(loadedOrder) ?? undefined) : form.product_name || undefined,
        order_id: loadedOrder?.id,
      });
      resetForm();
      setShowForm(false);
      await load();
    } finally {
      setIsSaving(false);
    }
  }

  const currency = summary?.currency ?? 'BRL';

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Devoluções</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Cancelamentos, devoluções e valores retidos/estornados.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {STATUS_OPTIONS.filter((option) => option.value !== '').map((option) => {
            const entry = summary.by_status[option.value as OrderReturnStatus];
            return (
              <KpiCard
                key={option.value}
                label={option.label}
                value={formatCurrency(entry?.total ?? 0, currency)}
                hint={`${entry?.count ?? 0} registro(s)`}
              />
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="search" className="text-sm font-medium text-black dark:text-white">
            Buscar
          </label>
          <input
            id="search"
            type="text"
            placeholder="Comprador, produto ou nº do pedido"
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="verified" className="text-sm font-medium text-black dark:text-white">
            Conferido
          </label>
          <select
            id="verified"
            value={verified}
            onChange={(e) => {
              setVerified(e.target.value);
              setPage(1);
            }}
            style={inputStyle}
            className={inputClass}
          >
            <option value="">Todos</option>
            <option value="1">Conferido</option>
            <option value="0">Não conferido</option>
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
        <button disabled={isSyncing} onClick={handleSync} className={buttonClass}>
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
        <button
          onClick={() => {
            if (showForm) resetForm();
            setShowForm((v) => !v);
          }}
          className={buttonClass}
        >
          {showForm ? 'Cancelar' : '+ Nova entrada'}
        </button>
      </div>

      {showForm && (
        <form
          ref={formRef}
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="form_order_number" className="text-sm font-medium text-black dark:text-white">
                Número do pedido
              </label>
              <input
                id="form_order_number"
                type="text"
                placeholder="Ex: 2000017810963318"
                value={orderNumberInput}
                onChange={(e) => setOrderNumberInput(e.target.value)}
                style={inputStyle}
                className={inputClass}
              />
            </div>
            {orderLookupStatus === 'loading' && (
              <span className="text-sm text-body dark:text-bodydark">Buscando pedido...</span>
            )}
            {orderLookupStatus === 'not_found' && (
              <span className="text-sm text-danger">Pedido não encontrado.</span>
            )}
            {orderLookupStatus !== 'found' && !manualMode && (
              <button
                type="button"
                onClick={() => setManualMode(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Registrar sem vincular a um pedido
              </button>
            )}
          </div>

          {orderLookupStatus === 'found' && loadedOrder && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-gray-2 px-4 py-3 text-sm dark:bg-meta-4">
              <div>
                <span className="text-body dark:text-bodydark">Comprador: </span>
                <span className="font-medium text-black dark:text-white">
                  {loadedOrder.buyer_nickname ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">Produto: </span>
                <span className="font-medium text-black dark:text-white">
                  {orderProductName(loadedOrder) ?? '—'}
                </span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">SKU: </span>
                <span className="font-medium text-black dark:text-white">{orderSku(loadedOrder) ?? '—'}</span>
              </div>
              <div>
                <span className="text-body dark:text-bodydark">Data da venda: </span>
                <span className="font-medium text-black dark:text-white">
                  {formatDateTime(loadedOrder.ordered_at)}
                </span>
              </div>
            </div>
          )}

          {(orderLookupStatus === 'found' || manualMode) && (
            <div className="flex flex-wrap items-end gap-3">
              {manualMode && orderLookupStatus !== 'found' && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form_buyer" className="text-sm font-medium text-black dark:text-white">
                      Comprador
                    </label>
                    <input
                      id="form_buyer"
                      type="text"
                      value={form.buyer_name}
                      onChange={(e) => setForm((f) => ({ ...f, buyer_name: e.target.value }))}
                      style={inputStyle}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="form_product" className="text-sm font-medium text-black dark:text-white">
                      Produto
                    </label>
                    <input
                      id="form_product"
                      type="text"
                      value={form.product_name}
                      onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
                      style={inputStyle}
                      className={inputClass}
                    />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form_status" className="text-sm font-medium text-black dark:text-white">
                  Status
                </label>
                <select
                  id="form_status"
                  required
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as OrderReturnStatus }))}
                  style={inputStyle}
                  className={inputClass}
                >
                  {STATUS_OPTIONS.filter((o) => o.value !== '').map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form_date" className="text-sm font-medium text-black dark:text-white">
                  Data e hora
                </label>
                <input
                  id="form_date"
                  type="datetime-local"
                  required
                  value={form.occurred_at}
                  onChange={(e) => setForm((f) => ({ ...f, occurred_at: e.target.value }))}
                  style={inputStyle}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="form_value" className="text-sm font-medium text-black dark:text-white">
                  Valor
                </label>
                <input
                  id="form_value"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  style={inputStyle}
                  className={inputClass}
                />
              </div>
              <button disabled={isSaving} type="submit" className={buttonClass}>
                {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}
        </form>
      )}

      {isLoading && groups.length === 0 ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-body dark:text-bodydark">Nenhum registro encontrado.</p>
      ) : (
        <div className="scrollbar-visible max-h-[70vh] overflow-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
          <table className="w-full table-auto border-separate border-spacing-x-3 border-spacing-y-0">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-2 text-center dark:bg-meta-4">
                <SortableHeader column="verified" label="Conferido" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="order" label="Pedido" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="ordered_at" label="Data venda" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="sku" label="SKU" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="buyer_name" label="Comprador" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="w-[15ch]" />
                <SortableHeader column="product_name" label="Produto" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} className="w-[20ch]" />
                <SortableHeader column="status" label="Status" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="updated_at" label="Data da atualização" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <SortableHeader column="value" label="Valor líquido" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort} />
                <th className="px-4 py-4 font-medium text-black dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map((group, groupIndex) => {
                const groupBg =
                  groupIndex % 2 === 0
                    ? 'bg-white dark:bg-boxdark'
                    : 'bg-gray-2 dark:bg-meta-4/40';

                return group.history.map((item, lineIndex) => {
                  const rowClass = item.verified ? VERIFIED_ROW_CLASS : groupBg;

                  return (
                    <tr key={item.id} className={`${rowClass} hover:bg-gray dark:hover:bg-meta-4`}>
                      {lineIndex === 0 && (
                        <td
                          rowSpan={group.history.length}
                          className="border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark"
                        >
                          <input
                            type="checkbox"
                            checked={item.verified}
                            onChange={() => handleToggleVerified(group.group_key, item.id, item.verified)}
                          />
                        </td>
                      )}
                      {lineIndex === 0 && (
                        <>
                          <td
                            rowSpan={group.history.length}
                            className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark"
                          >
                            <div className="flex items-center justify-center gap-1.5">
                              {group.order_id ? (
                                <Link href={`/orders/${group.order_id}`} className="font-medium text-primary">
                                  {group.mercadolivre_order_id}
                                </Link>
                              ) : (
                                <span className="text-body dark:text-bodydark">—</span>
                              )}
                              {group.mercadolivre_order_id && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyOrderNumber(group.group_key, group.mercadolivre_order_id!)}
                                  title={copiedKey === group.group_key ? 'Copiado!' : 'Copiar número do pedido'}
                                  className="text-body hover:text-primary dark:text-bodydark"
                                >
                                  <CopyIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleEdit(group)}
                              title="Adicionar uma atualização a esse pedido"
                              className="mt-1 whitespace-normal text-xs font-medium text-primary hover:underline"
                            >
                              + Atualização
                            </button>
                          </td>
                          <td
                            rowSpan={group.history.length}
                            className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle text-body dark:border-strokedark dark:text-bodydark"
                          >
                            <div className="flex flex-col items-center">
                              <span>{formatDatePart(group.ordered_at)}</span>
                              <span className="text-xs">{formatTimePart(group.ordered_at)}</span>
                            </div>
                          </td>
                          <td
                            rowSpan={group.history.length}
                            className="border-b border-stroke px-4 py-3 text-center align-middle text-body dark:border-strokedark dark:text-bodydark"
                          >
                            {group.sku ?? '—'}
                          </td>
                          <td
                            rowSpan={group.history.length}
                            className="w-[15ch] max-w-[15ch] truncate border-b border-stroke px-4 py-3 text-center align-middle text-body dark:border-strokedark dark:text-bodydark"
                            title={group.buyer_name ?? undefined}
                          >
                            {group.buyer_name ?? '—'}
                          </td>
                          <td
                            rowSpan={group.history.length}
                            className="w-[20ch] max-w-[20ch] truncate border-b border-stroke px-4 py-3 text-center align-middle text-body dark:border-strokedark dark:text-bodydark"
                            title={group.product_name ?? undefined}
                          >
                            {group.product_name ?? '—'}
                          </td>
                        </>
                      )}
                      <td className="border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark">
                        <span
                          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_BADGE_COLORS[item.status]}`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark">
                        {formatDateTime(item.occurred_at)}
                      </td>
                      <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle font-medium dark:border-strokedark">
                        {formatCurrency(item.value, currency)}
                      </td>
                      <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark">
                        {item.source === 'manual' && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-sm font-medium text-danger hover:underline"
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
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
