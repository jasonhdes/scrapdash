import { apiFetch } from '@/services/api';
import type { PaginatedResponse } from '@/types/pagination';
import type { OrderReturn, OrderReturnGroup, OrderReturnStatus, OrderReturnSummary } from '@/types/orderReturn';

export interface OrderReturnFilters {
  status?: string;
  verified?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

function buildQuery(filters: OrderReturnFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.verified !== undefined) params.set('verified', filters.verified ? '1' : '0');
  if (filters.search) params.set('search', filters.search);
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.perPage) params.set('per_page', String(filters.perPage));
  return params.toString();
}

export function listReturns(accountId: number, token: string, filters: OrderReturnFilters = {}) {
  const query = buildQuery(filters);
  return apiFetch<PaginatedResponse<OrderReturnGroup>>(
    `/accounts/${accountId}/returns${query ? `?${query}` : ''}`,
    { token },
  );
}

export function getReturnsSummary(accountId: number, token: string, filters: OrderReturnFilters = {}) {
  const query = buildQuery(filters);
  return apiFetch<OrderReturnSummary>(
    `/accounts/${accountId}/returns/summary${query ? `?${query}` : ''}`,
    { token },
  );
}

export function syncReturns(accountId: number, token: string) {
  return apiFetch<{ created: number; updated: number }>(`/accounts/${accountId}/returns/sync`, {
    method: 'POST',
    token,
  });
}

export interface CreateOrderReturnInput {
  status: OrderReturnStatus;
  occurred_at: string;
  buyer_name?: string;
  value: number;
  product_name?: string;
  order_id?: number;
}

export function createReturn(accountId: number, token: string, input: CreateOrderReturnInput) {
  return apiFetch<{ data: OrderReturn }>(`/accounts/${accountId}/returns`, {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function updateReturn(
  accountId: number,
  token: string,
  returnId: number,
  input: Partial<CreateOrderReturnInput>,
) {
  return apiFetch<{ data: OrderReturn }>(`/accounts/${accountId}/returns/${returnId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify(input),
  });
}

export function setReturnVerified(accountId: number, token: string, returnId: number, verified: boolean) {
  return apiFetch<{ data: OrderReturn }>(`/accounts/${accountId}/returns/${returnId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({ verified }),
  });
}

export function deleteReturn(accountId: number, token: string, returnId: number) {
  return apiFetch<{ deleted: boolean }>(`/accounts/${accountId}/returns/${returnId}`, {
    method: 'DELETE',
    token,
  });
}
