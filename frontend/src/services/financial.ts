import { apiFetch } from "@/services/api";
import type { PaginatedResponse } from "@/types/pagination";
import type { EditablePeriodField, FinancialPeriods, PaymentWithOrder } from "@/types/financial";

export type PaymentSortColumn =
  | "paid_at"
  | "net_received_amount"
  | "status"
  | "money_release_date"
  | "mercadolivre_order_id";

export interface PaymentFilters {
  status?: string;
  orderNumber?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: PaymentSortColumn;
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export function listPayments(accountId: number, token: string, filters: PaymentFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.orderNumber) params.set("order_number", filters.orderNumber);
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortDir) params.set("sort_dir", filters.sortDir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));

  const query = params.toString();

  return apiFetch<PaginatedResponse<PaymentWithOrder>>(
    `/accounts/${accountId}/payments${query ? `?${query}` : ""}`,
    { token },
  );
}

export function setPaymentReleased(accountId: number, token: string, paymentId: number, released: boolean) {
  return apiFetch<{ data: PaymentWithOrder }>(`/accounts/${accountId}/payments/${paymentId}`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ released }),
  });
}

export function getFinancialPeriods(accountId: number, token: string) {
  return apiFetch<FinancialPeriods>(`/accounts/${accountId}/financial/periods`, { token });
}

export function updatePeriodField(
  accountId: number,
  token: string,
  field: EditablePeriodField,
  value: number,
) {
  return apiFetch<FinancialPeriods>(`/accounts/${accountId}/financial/periods/current`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ field, value }),
  });
}

export function refreshSales(accountId: number, token: string) {
  return apiFetch<FinancialPeriods>(`/accounts/${accountId}/financial/periods/current/refresh-sales`, {
    method: "POST",
    token,
  });
}

export function closePeriod(accountId: number, token: string) {
  return apiFetch<FinancialPeriods>(`/accounts/${accountId}/financial/periods/close`, {
    method: "POST",
    token,
  });
}
