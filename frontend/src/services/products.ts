import { apiFetch } from "@/services/api";
import type { Product } from "@/types/product";
import type { PaginatedResponse } from "@/types/pagination";

export interface ProductFilters {
  status?: string;
  search?: string;
  page?: number;
}

export function listProducts(accountId: number, token: string, filters: ProductFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));

  const query = params.toString();

  return apiFetch<PaginatedResponse<Product>>(
    `/accounts/${accountId}/products${query ? `?${query}` : ""}`,
    { token },
  );
}
