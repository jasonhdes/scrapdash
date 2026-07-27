"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTokenExpiry } from "@/hooks/useTokenExpiry";
import styles from "@/styles/session.module.css";

export function SessionGuard({ children }: { children: ReactNode }) {
  const { token, refreshSession } = useAuth();
  const status = useTokenExpiry(token);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await refreshSession();
    } finally {
      setIsRefreshing(false);
    }
  }

  return (
    <>
      {status === "expiring" && (
        <div className={styles.alerts}>
          <div className={styles.alert}>
            Sua sessão vai expirar em breve.
            <button className={styles.button} disabled={isRefreshing} onClick={handleRefresh}>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      )}

      {status === "expired" ? (
        <div className={styles.blurWrapper}>
          <div className={styles.blurredContent}>{children}</div>
          <div className={styles.blurOverlay}>
            <button className={styles.button} disabled={isRefreshing} onClick={handleRefresh}>
              {isRefreshing ? "Atualizando..." : "Atualizar"}
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </>
  );
}
