import { apiFetch } from '@/services/api';
import type { PaginatedResponse } from '@/types/pagination';
import type { Movement, MonthlyReportResponse } from '@/types/report';

export interface MovementFilters {
  type?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

function buildQuery(filters: MovementFilters) {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.perPage) params.set('per_page', String(filters.perPage));
  return params.toString();
}

export function listMovements(accountId: number, token: string, filters: MovementFilters = {}) {
  const query = buildQuery(filters);
  return apiFetch<PaginatedResponse<Movement>>(
    `/accounts/${accountId}/reports/movements${query ? `?${query}` : ''}`,
    { token },
  );
}

export function getMonthlyReport(
  accountId: number,
  token: string,
  startDate?: string,
  endDate?: string,
) {
  const params = new URLSearchParams();
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  const query = params.toString();

  return apiFetch<MonthlyReportResponse>(
    `/accounts/${accountId}/reports/monthly${query ? `?${query}` : ''}`,
    { token },
  );
}
