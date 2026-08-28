'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { getMonthlyReport, listMovements } from '@/services/reports';
import type { MonthlyReportRow, Movement, MovementType } from '@/types/report';
import type { OrderReturnStatus } from '@/types/orderReturn';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { MonthlyOverviewChart } from '@/components/reports/MonthlyOverviewChart';
import { Pagination } from '@/components/shared/Pagination';
import { BRASILIA_TIMEZONE } from '@/utils/format';
import { getCurrentMonthRange } from '@/utils/dateRange';
import { RETURN_STATUS_BADGE_COLORS, RETURN_STATUS_LABELS } from '@/utils/returnStatus';

const TYPE_OPTIONS: { value: MovementType | ''; label: string }[] = [
  { value: '', label: 'Todos os tipos' },
  { value: 'venda', label: 'Venda aprovada' },
  { value: 'liberacao', label: 'Liberação de pagamento' },
  { value: 'pecas_devolvidas', label: 'Peças devolvidas' },
  { value: 'comprou_cancelou', label: 'Comprou e cancelou' },
  { value: 'valor_retido', label: 'Valor retido' },
  { value: 'estorno_valor', label: 'Cliente reembolsado' },
  { value: 'reembolso', label: 'Reembolso' },
  { value: 'desconto_venda', label: 'Desconto de venda' },
  { value: 'desconto_frete', label: 'Desconto de frete' },
];

const MOVEMENT_BADGE_COLORS: Record<string, string> = {
  venda: 'bg-success/10 text-success',
  liberacao: 'bg-success/10 text-success',
  ...RETURN_STATUS_BADGE_COLORS,
};

const EARLIEST_YEAR = 2025;

const inputClass =
  'rounded-lg border border-stroke bg-transparent py-2 pr-4 text-sm text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary';
const inputStyle = { paddingLeft: 16 };

function formatCurrency(value: number, currency = 'BRL') {
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

function formatMonthLabel(month: string) {
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function cancelledCount(row: MonthlyReportRow) {
  return row.returns_by_status['comprou_cancelou']?.count ?? 0;
}

// "Devolvidos" = pedidos com status 'desconto de venda' — cancelados e
// devolvidos com valor estornado ao comprador (ver regra de classificação
// do Estado da planilha/relatório do ML). 'Peças devolvidas' continua uma
// categoria só manual, nunca gerada automaticamente por aqui.
function returnedCount(row: MonthlyReportRow) {
  return row.returns_by_status['desconto_venda']?.count ?? 0;
}

function returnedValue(row: MonthlyReportRow) {
  return row.returns_by_status['desconto_venda']?.total ?? 0;
}

function freightDiscountValue(row: MonthlyReportRow) {
  return row.returns_by_status['desconto_frete']?.total ?? 0;
}

function returnsBreakdownTitle(row: MonthlyReportRow) {
  return Object.entries(row.returns_by_status)
    .filter(([, entry]) => entry.count > 0)
    .map(([status, entry]) => `${RETURN_STATUS_LABELS[status as OrderReturnStatus] ?? status}: ${formatCurrency(entry.total)} (${entry.count})`)
    .join('\n') || 'Sem devoluções/cancelamentos no mês.';
}

export default function ReportsPage() {
  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: currentYear - EARLIEST_YEAR + 1 },
    (_, i) => currentYear - i,
  );

  const [year, setYear] = useState(currentYear);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportRow[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(true);

  const [type, setType] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(() => getCurrentMonthRange().startDate);
  const [endDate, setEndDate] = useState(() => getCurrentMonthRange().endDate);
  const [page, setPage] = useState(1);

  const [movements, setMovements] = useState<Movement[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isMovementsLoading, setIsMovementsLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadMonthly = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsMonthlyLoading(true);
    try {
      const yearStart = `${year}-01-01`;
      const yearEnd = year === currentYear ? getCurrentMonthRange().endDate : `${year}-12-31`;
      const response = await getMonthlyReport(selectedAccountId, token, yearStart, yearEnd);
      setMonthlyRows(response.data);
      setCurrency(response.currency);
    } finally {
      setIsMonthlyLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, token, year]);

  const loadMovements = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsMovementsLoading(true);
    try {
      const response = await listMovements(selectedAccountId, token, {
        type: type || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        page,
        perPage: 50,
      });
      setMovements(response.data);
      setMeta(response.meta);
    } finally {
      setIsMovementsLoading(false);
    }
  }, [selectedAccountId, token, type, search, startDate, endDate, page]);

  useEffect(() => {
    loadMonthly();
  }, [loadMonthly]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">Relatórios</h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Movimentações financeiras e consolidado mês a mês.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      <div
        style={{ paddingLeft: 20 }}
        className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5"
      >
        <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
          Faturamento, devoluções e cancelamentos — {year}
        </h3>
        {isMonthlyLoading && monthlyRows.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando...</p>
        ) : monthlyRows.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhum dado disponível.</p>
        ) : (
          <MonthlyOverviewChart rows={monthlyRows} currency={currency} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-black dark:text-white">Consolidado mensal</h2>
          <div className="flex items-center gap-2">
            <label htmlFor="year" className="text-sm font-medium text-black dark:text-white">
              Ano
            </label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              style={inputStyle}
              className={inputClass}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isMonthlyLoading && monthlyRows.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando...</p>
        ) : monthlyRows.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhum dado no período.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-center dark:bg-meta-4">
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Mês</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Pedidos</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Receita bruta</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Receita líquida</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Taxas ML/MP</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Desconto de frete</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Canc./Devol.</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Saldo devolvidos</th>
                </tr>
              </thead>
              <tbody>
                {monthlyRows.map((row) => (
                  <tr key={row.month} className="hover:bg-gray-2 dark:hover:bg-meta-4">
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center font-medium dark:border-strokedark">
                      <Link href={`/reports/${row.month}`} className="text-primary hover:underline">
                        {formatMonthLabel(row.month)}
                      </Link>
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                      {row.orders_count}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center text-black dark:border-strokedark dark:text-white">
                      {formatCurrency(row.gross_revenue, currency)}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center font-medium text-success dark:border-strokedark">
                      {formatCurrency(row.net_revenue, currency)}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                      {formatCurrency(row.fees.ml_fee + row.fees.mp_processing_fee, currency)}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                      {formatCurrency(freightDiscountValue(row), currency)}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                      {cancelledCount(row)}/{returnedCount(row)}
                    </td>
                    <td
                      className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center font-medium text-danger dark:border-strokedark"
                      title={returnsBreakdownTitle(row)}
                    >
                      {formatCurrency(returnedValue(row), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">Movimentações</h2>

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
            <label htmlFor="type" className="text-sm font-medium text-black dark:text-white">
              Tipo
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              style={inputStyle}
              className={inputClass}
            >
              {TYPE_OPTIONS.map((option) => (
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
        </div>

        {isMovementsLoading && movements.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando...</p>
        ) : movements.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhuma movimentação encontrada.</p>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-2 text-center dark:bg-meta-4">
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Data</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Tipo</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Pedido</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Comprador</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Produto</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Valor</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                      {formatDateTime(movement.occurred_at)}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${MOVEMENT_BADGE_COLORS[movement.type] ?? 'bg-bodydark/20 text-bodydark2 dark:text-bodydark'}`}
                      >
                        {movement.label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center dark:border-strokedark">
                      {movement.order_id ? (
                        <Link href={`/orders/${movement.order_id}`} className="font-medium text-primary">
                          {movement.mercadolivre_order_id}
                        </Link>
                      ) : (
                        <span className="text-body dark:text-bodydark">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark">
                      {movement.buyer_name ?? '—'}
                    </td>
                    <td
                      className="max-w-[20ch] truncate border-b border-stroke px-4 py-3 text-center text-body dark:border-strokedark dark:text-bodydark"
                      title={movement.product_name ?? undefined}
                    >
                      {movement.product_name ?? '—'}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center font-medium dark:border-strokedark">
                      {formatCurrency(movement.value, currency)}
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
