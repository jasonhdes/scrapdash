'use client';

import { useCallback, useEffect, useState } from 'react';
import { getCustomersByState } from '@/services/dashboard';
import type { CustomersByStateRow } from '@/types/dashboard';

export function useCustomersByState(
  accountId: number | null,
  token: string | null,
  startDate: string | null,
  endDate: string | null,
) {
  const [data, setData] = useState<CustomersByStateRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId || !token) return;

    setIsLoading(true);
    try {
      const result = await getCustomersByState(accountId, token, { startDate, endDate });
      setData(result.data);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, token, startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, isLoading };
}
