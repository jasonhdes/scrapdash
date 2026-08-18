import { API_URL, apiFetch } from "@/services/api";
import type { Order } from "@/types/order";
import type { PaginatedResponse } from "@/types/pagination";

export type OrderSortColumn =
  | "ordered_at"
  | "total_amount"
  | "mercadolivre_order_id"
  | "buyer_nickname"
  | "status"
  | "money_release_date";

export interface OrderFilters {
  orderNumber?: string;
  buyer?: string;
  minTotal?: string;
  maxTotal?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  released?: boolean;
  processed?: boolean;
  product?: string;
  skus?: string[];
  location?: string;
  sortBy?: OrderSortColumn;
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}

export interface SkuOption {
  sku: string;
  title: string;
}

function buildParams(filters: OrderFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.orderNumber) params.set("order_number", filters.orderNumber);
  if (filters.buyer) params.set("buyer", filters.buyer);
  if (filters.minTotal) params.set("min_total", filters.minTotal);
  if (filters.maxTotal) params.set("max_total", filters.maxTotal);
  if (filters.status) params.set("status", filters.status);
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.released !== undefined) params.set("released", filters.released ? "1" : "0");
  if (filters.processed !== undefined) params.set("processed", filters.processed ? "1" : "0");
  if (filters.product) params.set("product", filters.product);
  filters.skus?.forEach((sku) => params.append("skus[]", sku));
  if (filters.location) params.set("location", filters.location);
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortDir) params.set("sort_dir", filters.sortDir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));
  return params;
}

export function listOrders(accountId: number, token: string, filters: OrderFilters = {}) {
  const query = buildParams(filters).toString();

  return apiFetch<PaginatedResponse<Order>>(
    `/accounts/${accountId}/orders${query ? `?${query}` : ""}`,
    { token },
  );
}

export function getSkuOptions(accountId: number, token: string) {
  return apiFetch<{ data: SkuOption[] }>(`/accounts/${accountId}/orders/sku-options`, { token });
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
