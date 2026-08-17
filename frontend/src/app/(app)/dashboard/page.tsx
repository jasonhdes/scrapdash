'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useDashboard } from '@/hooks/useDashboard';
import { useRevenueSeries } from '@/hooks/useRevenueSeries';
import { useCustomersByState } from '@/hooks/useCustomersByState';
import { connectMercadoLivre } from '@/services/accounts';
import type { Account } from '@/types/account';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { DateRangeFilter } from '@/components/dashboard/DateRangeFilter';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StatusDonutChart } from '@/components/dashboard/StatusDonutChart';
import { BrazilMap } from '@/components/dashboard/BrazilMap';

const ORDER_STATUS_LABELS: Record<string, string> = {
  paid: 'Pago',
  cancelled: 'Cancelado',
  partially_refunded: 'Parcialmente reembolsado',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  refunded: 'Reembolsado',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
  in_mediation: 'Em mediação',
};

const DATE_RANGE_STORAGE_KEY = 'scrapdash_dashboard_date_range';

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency ?? 'BRL',
  }).format(value);
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-sm text-body dark:text-bodydark">Carregando...</p>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const { user, token } = useAuth();
  const {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    selectedAccount,
    refresh: refreshAccounts,
  } = useAccounts(token);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(
    selectedAccountId,
    token,
    startDate || null,
    endDate || null,
  );
  const { data: revenueSeries } = useRevenueSeries(
    selectedAccountId,
    token,
    startDate || null,
    endDate || null,
  );
  const { data: customersByState } = useCustomersByState(
    selectedAccountId,
    token,
    startDate || null,
    endDate || null,
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(DATE_RANGE_STORAGE_KEY);
    if (!stored) return;
    try {
      const { startDate: s, endDate: e } = JSON.parse(stored);
      if (s) setStartDate(s);
      if (e) setEndDate(e);
    } catch {
      // ignore malformed stored value
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({ startDate, endDate }));
  }, [startDate, endDate]);

  useEffect(() => {
    const mlConnected = searchParams.get('ml_connected');

    if (mlConnected === '1') {
      setFeedback('Conta do Mercado Livre conectada com sucesso.');
      refreshAccounts();
    } else if (mlConnected === '0') {
      const reason = searchParams.get('reason') ?? 'erro_desconhecido';
      setFeedback(`Não foi possível conectar ao Mercado Livre (${reason}).`);
    }
  }, [searchParams, refreshAccounts]);

  if (!user) return null;

  async function handleConnect(account: Account) {
    if (!token) return;
    setConnectingId(account.id);
    try {
      const { redirect_url } = await connectMercadoLivre(account.id, token);
      window.location.href = redirect_url;
    } catch {
      setFeedback('Não foi possível iniciar a conexão com o Mercado Livre.');
      setConnectingId(null);
    }
  }

  const isTokenExpired = dashboard?.alerts.some((alert) => alert.type === 'token_expired') ?? false;
  const needsConnect = !!selectedAccount && !selectedAccount.mercadolivre_connected;
  const needsRefresh =
    !!selectedAccount && selectedAccount.mercadolivre_connected && isTokenExpired;
  const isBusy = !!selectedAccount && connectingId === selectedAccount.id;

  const kpiGrid = dashboard ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <KpiCard
        label="Receita"
        value={formatCurrency(dashboard.revenue.total, dashboard.revenue.currency)}
      />
      <KpiCard label="Pedidos" value={dashboard.orders.total} />
      <KpiCard
        label="Produtos"
        value={dashboard.products.total}
        hint={`${dashboard.products.active} ativos`}
      />
      <KpiCard label="Pagamentos aprovados" value={dashboard.payments.by_status['approved'] ?? 0} />
      <KpiCard label="Mensagens" value={dashboard.messages.total} />
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">
            Bem-vindo, {user.name}
          </h1>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      {feedback && <p className="text-sm text-body dark:text-bodydark">{feedback}</p>}

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        onChange={({ startDate: s, endDate: e }) => {
          setStartDate(s);
          setEndDate(e);
        }}
        onClear={() => {
          setStartDate('');
          setEndDate('');
        }}
      />

      {needsConnect && (
        <div>
          <button
            disabled={isBusy}
            onClick={() => handleConnect(selectedAccount)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isBusy ? 'Conectando...' : 'Conectar conta Mercado Livre'}
          </button>
        </div>
      )}

      {dashboard && dashboard.alerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {dashboard.alerts.map((alert, i) =>
            alert.type === 'unread_messages' ? (
              <Link
                key={i}
                href="/messages"
                className="rounded-lg border border-warning/30 bg-warning/10 py-3 pl-[29.2px] pr-[19.2px] text-sm text-black dark:text-white"
              >
                {alert.message}
              </Link>
            ) : (
              <div
                key={i}
                className="rounded-lg border border-warning/30 bg-warning/10 py-3 pl-[29.2px] pr-[19.2px] text-sm text-black dark:text-white"
              >
                {alert.message}
              </div>
            ),
          )}
        </div>
      )}

      {dashboardLoading && !dashboard ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando KPIs...</p>
      ) : needsRefresh ? (
        <div className="relative">
          <div className="pointer-events-none blur-md select-none">{kpiGrid}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              disabled={isBusy}
              onClick={() => handleConnect(selectedAccount)}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {isBusy ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      ) : (
        kpiGrid
      )}

      {dashboard && !needsRefresh && (
        <>
          {revenueSeries && revenueSeries.series.length > 0 && (
            <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
              <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Receita no período
              </h3>
              <RevenueChart series={revenueSeries.series} currency={revenueSeries.currency} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <StatusDonutChart
              title="Pedidos por status"
              byStatus={dashboard.orders.by_status}
              labels={ORDER_STATUS_LABELS}
            />
            <StatusDonutChart
              title="Pagamentos por status"
              byStatus={dashboard.payments.by_status}
              labels={PAYMENT_STATUS_LABELS}
            />
          </div>

          <div className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5">
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
              Clientes por estado
            </h3>
            <BrazilMap data={customersByState} />
          </div>
        </>
      )}
    </div>
  );
}
