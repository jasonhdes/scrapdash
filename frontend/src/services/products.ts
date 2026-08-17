import { apiFetch } from "@/services/api";
import type { Product } from "@/types/product";
import type { PaginatedResponse } from "@/types/pagination";

export type ProductSortColumn = "title" | "seller_sku" | "price" | "available_quantity" | "status";

export interface ProductFilters {
  status?: string;
  search?: string;
  sortBy?: ProductSortColumn;
  sortDir?: "asc" | "desc";
  page?: number;
}

export function listProducts(accountId: number, token: string, filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.sortBy) params.set("sort_by", filters.sortBy);
  if (filters.sortDir) params.set("sort_dir", filters.sortDir);
  if (filters.page) params.set("page", String(filters.page));

  const query = params.toString();

  return apiFetch<PaginatedResponse<Product>>(
    `/accounts/${accountId}/products${query ? `?${query}` : ""}`,
    { token },
  );
}
