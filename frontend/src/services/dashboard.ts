import { apiFetch } from "@/services/api";
import type { DashboardData } from "@/types/dashboard";

export interface DashboardDateRange {
  startDate?: string | null;
  endDate?: string | null;
}

export function getDashboard(accountId: number, token: string, range?: DashboardDateRange) {
  const params = new URLSearchParams();
  if (range?.startDate) params.set("start_date", range.startDate);
  if (range?.endDate) params.set("end_date", range.endDate);

  const query = params.toString();

  return apiFetch<DashboardData>(`/accounts/${accountId}/dashboard${query ? `?${query}` : ""}`, {
    token,
  });
}
