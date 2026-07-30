import { apiFetch } from '@/services/api';
import type { CustomersByStateData, DashboardData, RevenueSeriesData } from '@/types/dashboard';

export interface DashboardDateRange {
  startDate?: string | null;
  endDate?: string | null;
}

function toQuery(range?: DashboardDateRange) {
  const params = new URLSearchParams();
  if (range?.startDate) params.set('start_date', range.startDate);
  if (range?.endDate) params.set('end_date', range.endDate);

  const query = params.toString();
  return query ? `?${query}` : '';
}

export function getDashboard(accountId: number, token: string, range?: DashboardDateRange) {
  return apiFetch<DashboardData>(`/accounts/${accountId}/dashboard${toQuery(range)}`, {
    token,
  });
}

export function getRevenueSeries(accountId: number, token: string, range?: DashboardDateRange) {
  return apiFetch<RevenueSeriesData>(
    `/accounts/${accountId}/dashboard/revenue-series${toQuery(range)}`,
    {
      token,
    },
  );
}

export function getCustomersByState(accountId: number, token: string, range?: DashboardDateRange) {
  return apiFetch<CustomersByStateData>(
    `/accounts/${accountId}/dashboard/customers-by-state${toQuery(range)}`,
    {
      token,
    },
  );
}
