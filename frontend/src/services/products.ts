import { apiFetch } from "@/services/api";
import type { Product } from "@/types/product";
import type { PaginatedResponse } from "@/types/pagination";

export type ProductSortColumn =
  | "title"
  | "seller_sku"
  | "price"
  | "available_quantity"
  | "status"
  | "completed_sales_count"
  | "net_amount";

export interface ProductFilters {
  status?: string;
  search?: string;
  sortBy?: ProductSortColumn;
  sortDir?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
  page?: number;
  perPage?: number;
}

export function listProducts(accountId: number, token: string, filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortDir) params.set("sort_dir", filters.sortDir);
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.perPage) params.set("per_page", String(filters.perPage));

  const query = params.toString();

  return apiFetch<PaginatedResponse<Product>>(
    `/accounts/${accountId}/products${query ? `?${query}` : ""}`,
    { token },
  );
}

export function refreshProductPrices(accountId: number, token: string) {
  return apiFetch<{ updated: number }>(`/accounts/${accountId}/products/refresh-prices`, {
    method: "POST",
    token,
  });
}
