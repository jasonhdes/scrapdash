import { API_URL, apiFetch } from "@/services/api";
import type { Order } from "@/types/order";
import type { PaginatedResponse } from "@/types/pagination";

export interface OrderFilters {
  status?: string;
  processed?: boolean;
  startDate?: string;
  endDate?: string;
  page?: number;
}

function buildParams(filters: OrderFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.processed !== undefined) params.set("processed", filters.processed ? "1" : "0");
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.page) params.set("page", String(filters.page));
  return params;
}

export function listOrders(accountId: number, token: string, filters: OrderFilters = {}) {
  const query = buildParams(filters).toString();

  return apiFetch<PaginatedResponse<Order>>(
    `/accounts/${accountId}/orders${query ? `?${query}` : ""}`,
    { token },
  );
}

export function getOrder(accountId: number, orderId: number, token: string) {
  return apiFetch<{ data: Order }>(`/accounts/${accountId}/orders/${orderId}`, { token });
}

export function markOrderProcessed(accountId: number, orderId: number, processed: boolean, token: string) {
  return apiFetch<{ data: Order }>(`/accounts/${accountId}/orders/${orderId}/processed`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ processed }),
  });
}

export async function exportOrdersCsv(accountId: number, token: string, filters: OrderFilters = {}) {
  const query = buildParams(filters).toString();

  const response = await fetch(`${API_URL}/accounts/${accountId}/orders/export${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Não foi possível exportar os pedidos.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pedidos-${accountId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
