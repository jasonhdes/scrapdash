'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRevenueSeries } from '@/services/dashboard';
import type { RevenueSeriesData } from '@/types/dashboard';

export function useRevenueSeries(
  accountId: number | null,
  token: string | null,
  startDate: string | null,
  endDate: string | null,
) {
  const [data, setData] = useState<RevenueSeriesData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId || !token) return;

    setIsLoading(true);
    try {
      const result = await getRevenueSeries(accountId, token, { startDate, endDate });
      setData(result);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, token, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading };
}
