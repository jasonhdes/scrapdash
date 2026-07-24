"use client";

import { useCallback, useEffect, useState } from "react";
import { getDashboard } from "@/services/dashboard";
import type { DashboardData } from "@/types/dashboard";

const POLL_INTERVAL_MS = 30_000;

export function useDashboard(
  accountId: number | null,
  token: string | null,
  startDate: string | null,
  endDate: string | null,
) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accountId || !token) return;

    try {
      const result = await getDashboard(accountId, token, { startDate, endDate });
      setData(result);
      setError(null);
    } catch {
      setError("Não foi possível carregar os dados do dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId, token, startDate, endDate]);

  useEffect(() => {
    if (!accountId || !token) return;

    setIsLoading(true);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [accountId, token, load]);

  return { data, isLoading, error, refresh: load };
}
