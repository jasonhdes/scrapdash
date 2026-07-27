"use client";

import { useCallback, useEffect, useState } from "react";
import { listAccounts } from "@/services/accounts";
import type { Account } from "@/types/account";

const SELECTED_ACCOUNT_STORAGE_KEY = "scrapdash_selected_account";

export function useAccounts(token: string | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;

    const { data } = await listAccounts(token);
    setAccounts(data);
    setIsLoading(false);

    setSelectedAccountId((current) => {
      if (current && data.some((a) => a.id === current)) return current;
      const stored = Number(window.localStorage.getItem(SELECTED_ACCOUNT_STORAGE_KEY));
      if (stored && data.some((a) => a.id === stored)) return stored;
      return data[0]?.id ?? null;
    });
  }, [token]);

  useEffect(() => {
    if (token) load();
  }, [token, load]);

  useEffect(() => {
    if (selectedAccountId) {
      window.localStorage.setItem(SELECTED_ACCOUNT_STORAGE_KEY, String(selectedAccountId));
    }
  }, [selectedAccountId]);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? null;

  return { accounts, selectedAccountId, setSelectedAccountId, selectedAccount, isLoading, refresh: load };
}
