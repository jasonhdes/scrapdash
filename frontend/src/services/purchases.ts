import { apiFetch } from '@/services/api';
import type { PaginatedResponse } from '@/types/pagination';
import type { Purchase } from '@/types/purchase';

export interface PurchaseFilters {
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export function listPurchases(accountId: number, token: string, filters: PurchaseFilters = {}) {
  const params = new URLSearchParams();
  if (filters.startDate) params.set('start_date', filters.startDate);
  if (filters.endDate) params.set('end_date', filters.endDate);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.perPage) params.set('per_page', String(filters.perPage));
  const query = params.toString();

  return apiFetch<PaginatedResponse<Purchase>>(
    `/accounts/${accountId}/purchases${query ? `?${query}` : ''}`,
    { token },
  );
}

export interface CreatePurchaseInput {
  occurred_at: string;
  description: string;
  value: number;
}

export function createPurchase(accountId: number, token: string, input: CreatePurchaseInput) {
  return apiFetch<{ data: Purchase }>(`/accounts/${accountId}/purchases`, {
    method: 'POST',
    token,
    body: JSON.stringify(input),
  });
}

export function deletePurchase(accountId: number, token: string, purchaseId: number) {
  return apiFetch<{ deleted: boolean }>(`/accounts/${accountId}/purchases/${purchaseId}`, {
    method: 'DELETE',
    token,
  });
}
