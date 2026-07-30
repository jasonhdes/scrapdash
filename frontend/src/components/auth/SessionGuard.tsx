'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTokenExpiry } from '@/hooks/useTokenExpiry';

const buttonClass =
  'rounded-lg bg-primary px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-60';

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
      {status === 'expiring' && (
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-warning/30 bg-warning/10 px-4 py-2.5 text-sm text-black dark:text-white">
            Sua sessão vai expirar em breve.
            <button disabled={isRefreshing} onClick={handleRefresh} className={buttonClass}>
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      )}

      {status === 'expired' ? (
        <div className="relative">
          <div className="pointer-events-none blur-md select-none">{children}</div>
          <div className="absolute inset-0 flex items-center justify-center">
            <button disabled={isRefreshing} onClick={handleRefresh} className={buttonClass}>
              {isRefreshing ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </>
  );
}
