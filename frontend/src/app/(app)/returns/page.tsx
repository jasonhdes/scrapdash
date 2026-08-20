'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { triggerMercadoLivreSync } from '@/services/accounts';
import {
  createReturn,
  deleteReturn,
  getReturnsSummary,
  listReturns,
  setReturnVerified,
  syncReturns,
} from '@/services/returns';
import type { OrderReturnGroup, OrderReturnStatus, OrderReturnSummary } from '@/types/orderReturn';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Pagination } from '@/components/shared/Pagination';
import { BRASILIA_TIMEZONE } from '@/utils/format';
import { getCurrentMonthRange } from '@/utils/dateRange';

const STATUS_OPTIONS: { value: OrderReturnStatus | ''; label: string }[] = [
  { value: '', label: 'Todos os status' },
  { value: 'pecas_devolvidas', label: 'Peças devolvidas' },
  { value: 'comprou_cancelou', label: 'Comprou e cancelou' },
  { value: 'valor_retido', label: 'Valor retido' },
  { value: 'estorno_valor', label: 'Estorno de valor' },
  { value: 'desconto_venda', label: 'Desconto de venda' },
  { value: 'desconto_frete', label: 'Desconto de frete' },
  { value: 'venda_balcao', label: 'Venda balcão' },
];

const STATUS_LABELS: Record<OrderReturnStatus, string> = {
  pecas_devolvidas: 'Peças devolvidas',
  comprou_cancelou: 'Comprou e cancelou',
  valor_retido: 'Valor retido',
  estorno_valor: 'Estorno de valor',
  desconto_venda: 'Desconto de venda',
  desconto_frete: 'Desconto de frete',
  venda_balcao: 'Venda balcão',
};

const STATUS_BADGE_COLORS: Record<OrderReturnStatus, string> = {
  pecas_devolvidas: 'bg-danger/10 text-danger',
  comprou_cancelou: 'bg-warning/10 text-warning',
  valor_retido: 'bg-[#8B5CF6]/10 text-[#8B5CF6]',
  estorno_valor: 'bg-meta-5/10 text-meta-5',
  desconto_venda: 'bg-bodydark/20 text-bodydark2 dark:text-bodydark',
  desconto_frete: 'bg-bodydark/20 text-bodydark2 dark:text-bodydark',
  venda_balcao: 'bg-success/10 text-success',
};

const EMPTY_FORM = {
  status: 'desconto_venda' as OrderReturnStatus,
  occurred_at: '',
  buyer_name: '',
  value: '',
  product_name: '',
};

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
        buyer_name: form.buyer_name || undefined,
        value: Number(form.value),
        product_name: form.product_name || undefined,
      });
      setForm(EMPTY_FORM);
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
        <button onClick={() => setShowForm((v) => !v)} className={buttonClass}>
          {showForm ? 'Cancelar' : '+ Nova entrada'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="flex flex-wrap items-end gap-3 rounded-sm border border-stroke bg-white p-4 shadow-1 dark:border-strokedark dark:bg-boxdark"
        >
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
          <button disabled={isSaving} type="submit" className={buttonClass}>
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
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
                <th className="px-4 py-4 font-medium text-black dark:text-white">Pedido</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Data venda</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">SKU</th>
                <th className="w-[15ch] px-4 py-4 font-medium text-black dark:text-white">Comprador</th>
                <th className="w-[20ch] px-4 py-4 font-medium text-black dark:text-white">Produto</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Conferido</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Data da atualização</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Valor líquido</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white">Ações</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, groupIndex) => {
                const groupBg =
                  groupIndex % 2 === 0
                    ? 'bg-white dark:bg-boxdark'
                    : 'bg-gray-2 dark:bg-meta-4/40';

                return group.history.map((item, lineIndex) => {
                  const rowClass = item.verified ? VERIFIED_ROW_CLASS : groupBg;

                  return (
                    <tr key={item.id} className={`${rowClass} hover:bg-gray dark:hover:bg-meta-4`}>
                      {lineIndex === 0 && (
                        <>
                          <td
                            rowSpan={group.history.length}
                            className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark"
                          >
                            {group.order_id ? (
                              <Link href={`/orders/${group.order_id}`} className="font-medium text-primary">
                                {group.mercadolivre_order_id}
                              </Link>
                            ) : (
                              <span className="text-body dark:text-bodydark">—</span>
                            )}
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
                        <input
                          type="checkbox"
                          checked={item.verified}
                          onChange={() => handleToggleVerified(group.group_key, item.id, item.verified)}
                        />
                      </td>
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
