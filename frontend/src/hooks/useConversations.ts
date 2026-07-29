"use client";

import { useCallback, useEffect, useState } from "react";
import { listConversations } from "@/services/messages";
import type { Conversation } from "@/types/message";

const POLL_INTERVAL_MS = 30_000;

export function useConversations(accountId: number | null, token: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accountId || !token) return;

    try {
      const { data, meta } = await listConversations(accountId, token);
      setConversations(data);
      setUnreadTotal(meta.unread_total);
    } finally {
      setIsLoading(false);
    }
  }, [accountId, token]);

  useEffect(() => {
    if (!accountId || !token) return;

    setIsLoading(true);
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [accountId, token, load]);

  return { conversations, unreadTotal, isLoading, refresh: load };
}
