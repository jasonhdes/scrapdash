'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { importOrderHistory, triggerMercadoLivreSync } from '@/services/accounts';
import { exportOrdersCsv, listOrders } from '@/services/orders';
import type { OrderSortColumn } from '@/services/orders';
import { createReturn, setReturnVerified } from '@/services/returns';
import type { Order } from '@/types/order';
import type { OrderReturnStatus } from '@/types/orderReturn';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { Pagination } from '@/components/shared/Pagination';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BRASILIA_TIMEZONE } from '@/utils/format';
import { getCurrentMonthRange } from '@/utils/dateRange';
import { DEPOSIT_COLORS, DEPOSIT_LABELS, depositKey } from '@/utils/deposit';
import { RETURN_STATUS_BADGE_COLORS, RETURN_STATUS_LABELS } from '@/utils/returnStatus';

const MOVEMENT_STATUS_OPTIONS: { value: OrderReturnStatus; label: string }[] = [
  { value: 'pecas_devolvidas', label: 'Peças devolvidas' },
  { value: 'comprou_cancelou', label: 'Comprou e cancelou' },
  { value: 'valor_retido', label: 'Valor retido (em mediação)' },
  { value: 'estorno_valor', label: 'Cliente reembolsado' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'desconto_venda', label: 'Desconto de venda' },
  { value: 'desconto_frete', label: 'Desconto de frete' },
];

const EMPTY_MOVEMENT_FORM = {
  status: 'desconto_venda' as OrderReturnStatus,
  occurred_at: '',
  value: '',
};

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
  releaseDate: string | null | undefined,
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

const buttonClass =
  'rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-black dark:border-strokedark dark:text-white';
const inputClass =
  'rounded-lg border border-stroke bg-transparent px-3 py-2 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const primaryButtonClass =
  'rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60';

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

  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate);
  const [sortBy, setSortBy] = useState<OrderSortColumn | undefined>(undefined);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [historyState, setHistoryState] = useState<'idle' | 'importing' | 'done' | 'skipped'>('idle');
  const [expandedPacks, setExpandedPacks] = useState<Set<string>>(new Set());
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [movementForm, setMovementForm] = useState(EMPTY_MOVEMENT_FORM);
  const [isSavingMovement, setIsSavingMovement] = useState(false);

  function toggleEditor(orderId: number) {
    setEditingOrderId((current) => {
      if (current === orderId) return null;
      setMovementForm(EMPTY_MOVEMENT_FORM);
      return orderId;
    });
  }

  async function handleCreateMovement(order: Order, e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAccountId || !token) return;
    setIsSavingMovement(true);
    try {
      await createReturn(selectedAccountId, token, {
        status: movementForm.status,
        occurred_at: movementForm.occurred_at,
        buyer_name: order.buyer_nickname ?? undefined,
        value: Number(movementForm.value),
        product_name: order.items?.map((item) => item.title).filter(Boolean).join(', ') || undefined,
        order_id: order.id,
      });
      setMovementForm(EMPTY_MOVEMENT_FORM);
      setEditingOrderId(null);
      await loadOrders();
    } finally {
      setIsSavingMovement(false);
    }
  }

  async function handleToggleVerified(returnId: number, current: boolean) {
    if (!selectedAccountId || !token) return;
    await setReturnVerified(selectedAccountId, token, returnId, !current);
    await loadOrders();
  }

  function togglePack(packId: string) {
    setExpandedPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  }

  // Pedidos que compartilham o mesmo `pack_id` não nulo (compra combinada)
  // colapsam numa única linha de resumo, expansível para ver os pedidos
  // individuais — o Mercado Livre só mostra o número do pacote pro
  // vendedor, então é essa soma que precisa bater com o que ele vê lá.
  const displayRows = useMemo(() => {
    const seenPacks = new Set<string>();
    const rows: (
      | { kind: 'single'; order: Order }
      | { kind: 'pack'; packId: string; orders: Order[]; total: number }
    )[] = [];

    for (const order of orders) {
      if (!order.pack_id) {
        rows.push({ kind: 'single', order });
        continue;
      }
      if (seenPacks.has(order.pack_id)) continue;
      seenPacks.add(order.pack_id);

      const packOrders = orders.filter((o) => o.pack_id === order.pack_id);
      const total =
        order.pack_total_amount ?? packOrders.reduce((sum, o) => sum + o.total_amount, 0);
      rows.push({ kind: 'pack', packId: order.pack_id, orders: packOrders, total });
    }

    return rows;
  }, [orders]);

  const filters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortDir,
    page,
    perPage: startDate || endDate ? 5000 : undefined,
  };

  const loadOrders = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    triggerMercadoLivreSync(selectedAccountId, token);
    setIsLoading(true);
    try {
      const response = await listOrders(selectedAccountId, token, filters);
      setOrders(response.data);
      setMeta(response.meta);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, token, startDate, endDate, sortBy, sortDir, page]);

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

  async function handleImportHistory() {
    if (!selectedAccountId || !token || historyState === 'importing') return;
    setHistoryState('importing');
    try {
      const result = await importOrderHistory(selectedAccountId, token);
      setHistoryState(result?.triggered ? 'done' : 'skipped');
    } catch {
      setHistoryState('idle');
      return;
    }
    setTimeout(() => setHistoryState('idle'), 4000);
  }

  function clearFilters() {
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

  function renderOrderRow(order: Order, isPackMember = false) {
    const isEditing = editingOrderId === order.id;

    return (
      <Fragment key={order.id}>
      <tr
        className="odd:bg-white even:bg-gray-2 hover:bg-gray dark:odd:bg-boxdark dark:even:bg-meta-4/40 dark:hover:bg-meta-4"
      >
        <td
          className={`whitespace-nowrap border-b border-stroke px-4 py-3 dark:border-strokedark ${isPackMember ? 'pl-8' : ''}`}
        >
          <Link href={`/orders/${order.id}`} className="font-medium text-primary">
            {order.mercadolivre_order_id}
          </Link>
        </td>
        <td className="w-[10ch] max-w-[10ch] truncate border-b border-stroke px-4 py-3 text-sm text-body dark:border-strokedark dark:text-bodydark">
          {order.items && order.items.length > 0
            ? order.items.map((item) => (
                <div key={item.id} className="truncate" title={item.seller_sku ?? undefined}>
                  {item.seller_sku ?? '—'}
                </div>
              ))
            : '—'}
        </td>
        <td className="border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
          <StatusBadge
            status={depositKey(order.logistic_type)}
            labels={DEPOSIT_LABELS}
            colors={DEPOSIT_COLORS}
          />
        </td>
        <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-black dark:border-strokedark dark:text-white">
          {formatCurrency(order.total_amount, order.currency)}
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
        <td className="border-b border-stroke px-4 py-3 dark:border-strokedark">
          {order.return_statuses && order.return_statuses.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-1">
              {order.return_statuses.map((entry) => (
                <StatusBadge
                  key={entry.id}
                  status={entry.status}
                  labels={RETURN_STATUS_LABELS}
                  colors={RETURN_STATUS_BADGE_COLORS}
                />
              ))}
            </div>
          ) : (
            <span className="text-body dark:text-bodydark">—</span>
          )}
        </td>
        <td className="border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
          <button
            type="button"
            onClick={() => toggleEditor(order.id)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {isEditing ? 'Fechar' : 'Editar'}
          </button>
        </td>
      </tr>
      {isEditing && (
        <tr>
          <td
            colSpan={9}
            className="border-b border-stroke bg-gray-2/60 px-4 py-4 dark:border-strokedark dark:bg-meta-4/30"
          >
            <div className="flex flex-col gap-3">
              {order.return_statuses && order.return_statuses.length > 0 && (
                <div className="overflow-x-auto rounded-sm border border-stroke dark:border-strokedark">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="bg-gray-2 text-center dark:bg-meta-4">
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Status</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Valor</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Data</th>
                        <th className="px-3 py-2 font-medium text-black dark:text-white">Conferido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.return_statuses.map((entry) => (
                        <tr key={entry.id}>
                          <td className="border-b border-stroke px-3 py-2 text-center dark:border-strokedark">
                            <StatusBadge
                              status={entry.status}
                              labels={RETURN_STATUS_LABELS}
                              colors={RETURN_STATUS_BADGE_COLORS}
                            />
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-black dark:border-strokedark dark:text-white">
                            {formatCurrency(entry.value, order.currency)}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center text-body dark:border-strokedark dark:text-bodydark">
                            {formatDate(entry.occurred_at)}
                          </td>
                          <td className="border-b border-stroke px-3 py-2 text-center dark:border-strokedark">
                            <input
                              type="checkbox"
                              checked={entry.verified}
                              onChange={() => handleToggleVerified(entry.id, entry.verified)}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <form
                onSubmit={(e) => handleCreateMovement(order, e)}
                className="flex flex-wrap items-end gap-3"
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`movement-status-${order.id}`}
                    className="text-xs font-medium text-black dark:text-white"
                  >
                    Status
                  </label>
                  <select
                    id={`movement-status-${order.id}`}
                    value={movementForm.status}
                    onChange={(e) =>
                      setMovementForm((f) => ({ ...f, status: e.target.value as OrderReturnStatus }))
                    }
                    className={inputClass}
                  >
                    {MOVEMENT_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`movement-date-${order.id}`}
                    className="text-xs font-medium text-black dark:text-white"
                  >
                    Data
                  </label>
                  <input
                    id={`movement-date-${order.id}`}
                    type="datetime-local"
                    required
                    value={movementForm.occurred_at}
                    onChange={(e) => setMovementForm((f) => ({ ...f, occurred_at: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor={`movement-value-${order.id}`}
                    className="text-xs font-medium text-black dark:text-white"
                  >
                    Valor
                  </label>
                  <input
                    id={`movement-value-${order.id}`}
                    type="number"
                    step="0.01"
                    required
                    value={movementForm.value}
                    onChange={(e) => setMovementForm((f) => ({ ...f, value: e.target.value }))}
                    className={`${inputClass} w-28`}
                  />
                </div>
                <button type="submit" disabled={isSavingMovement} className={primaryButtonClass}>
                  {isSavingMovement ? 'Salvando...' : 'Salvar'}
                </button>
              </form>
            </div>
          </td>
        </tr>
      )}
      </Fragment>
    );
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
        <button
          disabled={historyState === 'importing'}
          onClick={handleImportHistory}
          title="Busca no Mercado Livre pedidos de até 1 ano atrás que ainda não estão no sistema"
          className={buttonClass}
        >
          {historyState === 'importing'
            ? 'Importando...'
            : historyState === 'done'
              ? 'Importação iniciada ✓'
              : historyState === 'skipped'
                ? 'Já importado recentemente'
                : 'Importar histórico (1 ano)'}
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
              <tr className="bg-gray-2 text-center dark:bg-meta-4">
                <SortableHeader column="mercadolivre_order_id" label="Pedido" />
                <th className="w-[10ch] max-w-[10ch] px-4 py-4 font-medium text-black dark:text-white">SKU</th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">Depósito</th>
                <SortableHeader column="total_amount" label="Valor anúncio" />
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Valor líquido
                </th>
                <SortableHeader column="ordered_at" label="Data venda" />
                <SortableHeader column="money_release_date" label="Data liberação" />
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Devoluções
                </th>
                <th className="whitespace-nowrap px-4 py-4 font-medium text-black dark:text-white">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                if (row.kind === 'single') {
                  return renderOrderRow(row.order);
                }

                const isExpanded = expandedPacks.has(row.packId);
                return (
                  <Fragment key={`pack-frag-${row.packId}`}>
                    <tr
                      key={`pack-${row.packId}`}
                      onClick={() => togglePack(row.packId)}
                      className="cursor-pointer bg-gray-2/70 hover:bg-gray dark:bg-meta-4/60 dark:hover:bg-meta-4"
                    >
                      <td
                        colSpan={9}
                        className="border-b border-stroke px-4 py-3 dark:border-strokedark"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-body dark:text-bodydark">
                            {isExpanded ? '▼' : '▶'}
                          </span>
                          <span className="font-medium text-black dark:text-white">
                            Pacote {row.packId}
                          </span>
                          <span className="text-body dark:text-bodydark">
                            · {row.orders.length} pedidos · Valor total:{' '}
                            {formatCurrency(row.total, row.orders[0]?.currency ?? null)}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && row.orders.map((order) => renderOrderRow(order, true))}
                  </Fragment>
                );
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
