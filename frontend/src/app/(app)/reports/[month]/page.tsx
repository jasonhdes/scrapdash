'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useDashboard } from '@/hooks/useDashboard';
import { useRevenueSeries } from '@/hooks/useRevenueSeries';
import { useCustomersByState } from '@/hooks/useCustomersByState';
import { listOrders } from '@/services/orders';
import type { Order, OrderReturnStatusEntry } from '@/types/order';
import { AccountSelector } from '@/components/dashboard/AccountSelector';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { StatusDonutChart } from '@/components/dashboard/StatusDonutChart';
import { BrazilMap } from '@/components/dashboard/BrazilMap';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BRASILIA_TIMEZONE } from '@/utils/format';
import { getMonthRange } from '@/utils/dateRange';
import { RETURN_STATUS_BADGE_COLORS, RETURN_STATUS_LABELS } from '@/utils/returnStatus';
import type { OrderReturnStatus } from '@/types/orderReturn';

const ORDER_GROUP_LABELS: Record<string, string> = {
  completed: 'Finalizado',
  in_transit: 'A caminho',
  returned: 'Devolvido',
  cancelled: 'Cancelados',
};

const ORDER_GROUP_COLORS: Record<string, string> = {
  completed: '#219653',
  in_transit: '#259AE6',
  returned: '#D34053',
  cancelled: '#FFBA00',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  approved: 'Aprovado',
  refunded: 'Venda cancelada',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
  in_mediation: 'Em mediação',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  approved: '#219653',
  refunded: '#D34053',
  rejected: '#8B5CF6',
  cancelled: '#FFBA00',
  in_mediation: '#FFA70B',
};

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

function sumOrders(list: Order[]) {
  return {
    gross: list.reduce((acc, order) => acc + order.total_amount, 0),
    net: list.reduce((acc, order) => acc + (order.net_received_amount ?? 0), 0),
  };
}

function formatGrossNetHint(gross: number, net: number, currency: string | null) {
  return `${formatCurrency(gross, currency)} bruto · ${formatCurrency(net, currency)} líquido`;
}

function formatMonthLabel(month: string) {
  const label = new Date(`${month}-01T00:00:00`).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function returnBadges(entries: OrderReturnStatusEntry[] | undefined) {
  if (!entries || entries.length === 0) {
    return <span className="text-body dark:text-bodydark">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-1">
      {entries.map((entry) => (
        <span
          key={entry.id}
          className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${RETURN_STATUS_BADGE_COLORS[entry.status as OrderReturnStatus] ?? 'bg-bodydark/20 text-bodydark2 dark:text-bodydark'}`}
        >
          {RETURN_STATUS_LABELS[entry.status as OrderReturnStatus] ?? entry.status}
        </span>
      ))}
    </div>
  );
}

export default function ReportMonthPage() {
  const params = useParams<{ month: string }>();
  const month = params.month;
  const { startDate, endDate } = getMonthRange(month);

  const { token } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(
    selectedAccountId,
    token,
    startDate,
    endDate,
  );
  const { data: revenueSeries } = useRevenueSeries(selectedAccountId, token, startDate, endDate);
  const { data: customersByState } = useCustomersByState(selectedAccountId, token, startDate, endDate);

  const [orders, setOrders] = useState<Order[]>([]);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);

  const loadOrders = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsOrdersLoading(true);
    try {
      const response = await listOrders(selectedAccountId, token, {
        startDate,
        endDate,
        perPage: 5000,
        sortBy: 'ordered_at',
        sortDir: 'desc',
      });
      setOrders(response.data);
    } finally {
      setIsOrdersLoading(false);
    }
  }, [selectedAccountId, token, startDate, endDate]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Mesma classificação de "enviado"/"devolvido" usada em DashboardService —
  // calculada aqui em cima da mesma lista de pedidos já carregada pra tabela
  // abaixo, garantindo que os dois batam entre si.
  const orderSums = useMemo(() => {
    const shipped = orders.filter(
      (order) => order.shipping_status === 'shipped' || order.shipping_status === 'delivered',
    );
    const returned = orders.filter(
      (order) =>
        order.status === 'cancelled' &&
        (order.shipping_status === 'delivered' || order.shipping_status === 'not_delivered'),
    );

    return { all: sumOrders(orders), shipped: sumOrders(shipped), returned: sumOrders(returned) };
  }, [orders]);

  return (
    <div className="flex flex-col gap-5">
      <Link href="/reports" className="text-sm font-medium text-primary">
        ← Voltar para relatórios
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-title-md font-bold text-black dark:text-white">
            {formatMonthLabel(month)}
          </h1>
          <p className="mt-1 text-sm text-body dark:text-bodydark">
            Visão geral e pedidos do período.
          </p>
        </div>
        <AccountSelector
          accounts={accounts}
          selectedId={selectedAccountId}
          onChange={setSelectedAccountId}
        />
      </div>

      {dashboardLoading && !dashboard ? (
        <p className="text-sm text-body dark:text-bodydark">Carregando KPIs...</p>
      ) : dashboard ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Receita"
              value={`${formatCurrency(dashboard.revenue.total, dashboard.revenue.currency)} (bruto)`}
              secondaryValue={`${formatCurrency(dashboard.revenue.net_total, dashboard.revenue.currency)} (líquido)`}
            />
            <KpiCard
              label="Pedidos"
              value={dashboard.orders.total}
              hint={formatGrossNetHint(orderSums.all.gross, orderSums.all.net, dashboard.revenue.currency)}
            />
            <KpiCard
              label="Enviados"
              value={dashboard.orders.shipped}
              hint={formatGrossNetHint(orderSums.shipped.gross, orderSums.shipped.net, dashboard.revenue.currency)}
            />
            <KpiCard
              label="Devolvidos"
              value={dashboard.orders.returned}
              hint={formatGrossNetHint(orderSums.returned.gross, orderSums.returned.net, dashboard.revenue.currency)}
            />
          </div>

          {revenueSeries && revenueSeries.series.length > 0 && (
            <div
              style={{ paddingLeft: 20 }}
              className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5"
            >
              <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
                Receita no mês
              </h3>
              <RevenueChart series={revenueSeries.series} currency={revenueSeries.currency} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <StatusDonutChart
              title="Pedidos por status"
              byStatus={dashboard.orders.by_group}
              labels={ORDER_GROUP_LABELS}
              statusColors={ORDER_GROUP_COLORS}
              total={dashboard.orders.total}
              totalLabel="Total de pedidos"
            />
            <StatusDonutChart
              title="Pagamentos por status"
              byStatus={dashboard.payments.by_status}
              labels={PAYMENT_STATUS_LABELS}
              statusColors={PAYMENT_STATUS_COLORS}
            />
          </div>

          <div
            style={{ paddingLeft: 20 }}
            className="rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-1 dark:border-strokedark dark:bg-boxdark sm:px-7.5"
          >
            <h3 className="mb-4 text-lg font-semibold text-black dark:text-white">
              Clientes por estado
            </h3>
            <BrazilMap data={customersByState} />
          </div>
        </>
      ) : null}

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-black dark:text-white">Pedidos do mês</h2>

        {isOrdersLoading && orders.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-body dark:text-bodydark">Nenhum pedido nesse período.</p>
        ) : (
          <div className="scrollbar-visible max-h-[70vh] overflow-auto rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
            <table className="w-full table-auto border-separate border-spacing-x-3 border-spacing-y-0">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-2 text-center dark:bg-meta-4">
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Pedido</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Data</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Comprador</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Valor</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                  <th className="px-4 py-4 font-medium text-black dark:text-white">
                    Devolução/cancelamento
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr
                    key={order.id}
                    className={`${index % 2 === 0 ? 'bg-white dark:bg-boxdark' : 'bg-gray-2 dark:bg-meta-4/40'} hover:bg-gray dark:hover:bg-meta-4`}
                  >
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark">
                      <Link href={`/orders/${order.id}`} className="font-medium text-primary">
                        {order.mercadolivre_order_id}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle text-body dark:border-strokedark dark:text-bodydark">
                      {formatDate(order.ordered_at)}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle text-body dark:border-strokedark dark:text-bodydark">
                      {order.buyer_nickname ?? '—'}
                    </td>
                    <td className="whitespace-nowrap border-b border-stroke px-4 py-3 text-center align-middle font-medium text-black dark:border-strokedark dark:text-white">
                      {formatCurrency(order.total_amount, order.currency)}
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="border-b border-stroke px-4 py-3 text-center align-middle dark:border-strokedark">
                      {returnBadges(order.return_statuses)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
