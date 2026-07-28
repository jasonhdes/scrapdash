import { apiFetch } from "@/services/api";
import type { PaginatedResponse } from "@/types/pagination";
import type { FinancialSummary, PaymentWithOrder, ReconciliationRow } from "@/types/financial";

export interface PaymentFilters {
  status?: string;
  paymentMethod?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}

export function listPayments(accountId: number, token: string, filters: PaymentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.paymentMethod) params.set("payment_method", filters.paymentMethod);
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.page) params.set("page", String(filters.page));

  const query = params.toString();

  return apiFetch<PaginatedResponse<PaymentWithOrder>>(
    `/accounts/${accountId}/payments${query ? `?${query}` : ""}`,
    { token },
  );
}

export function getFinancialSummary(accountId: number, token: string, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const query = params.toString();

  return apiFetch<FinancialSummary>(
    `/accounts/${accountId}/financial/summary${query ? `?${query}` : ""}`,
    { token },
  );
}

export function getReconciliation(accountId: number, token: string) {
  return apiFetch<{ data: ReconciliationRow[]; meta: { total: number } }>(
    `/accounts/${accountId}/financial/reconciliation`,
    { token },
  );
}
