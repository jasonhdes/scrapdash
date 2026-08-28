'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useTheme } from '@/hooks/useTheme';
import { connectMercadoLivre, triggerMercadoLivreSync } from '@/services/accounts';

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="4.5" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M4 12a8 8 0 0 1 13.66-5.66M20 12a8 8 0 0 1-13.66 5.66"
        strokeLinecap="round"
      />
      <path d="M17 3v4h-4M7 21v-4h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const router = useRouter();
  const { user, token, logout } = useAuth();
  const { selectedAccountId, selectedAccount } = useAccounts(token);
  const { theme, toggleTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [syncState, setSyncState] = useState<'idle' | 'syncing' | 'done' | 'skipped'>('idle');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const autoReconnectAttempted = useRef(false);

  async function handleLogout() {
    setUserMenuOpen(false);
    await logout();
    router.push('/login');
  }

  async function handleReconnect() {
    if (!selectedAccountId || !token) return;
    setIsReconnecting(true);
    try {
      const { redirect_url } = await connectMercadoLivre(selectedAccountId, token);
      window.location.href = redirect_url;
    } catch {
      // Provavelmente um user_partner sem permissão de reconectar (só o
      // dono da conta ou master pode) — não trava a tela por isso.
      setIsReconnecting(false);
    }
  }

  // O token do Mercado Livre não tem refresh_token pra se renovar sozinho
  // (achado desta sessão), então precisa de reconexão manual — mas em vez
  // de esperar o usuário notar e clicar, dispara o próprio fluxo assim que
  // detecta o token vencido. Só tenta 1x por carregamento da página (evita
  // loop de redirecionamento se algo der errado) — o botão continua
  // disponível pra tentar de novo manualmente a qualquer momento.
  useEffect(() => {
    if (
      selectedAccount?.mercadolivre_token_expired &&
      !autoReconnectAttempted.current &&
      selectedAccountId &&
      token
    ) {
      autoReconnectAttempted.current = true;
      handleReconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount?.mercadolivre_token_expired, selectedAccountId, token]);

  async function handleSync() {
    if (!selectedAccountId || !token || syncState === 'syncing') return;
    setSyncState('syncing');
    try {
      const result = await triggerMercadoLivreSync(selectedAccountId, token);
      setSyncState(result?.triggered ? 'done' : 'skipped');
    } catch {
      setSyncState('idle');
      return;
    }
    setTimeout(() => setSyncState('idle'), 2500);
  }

  return (
    <header className="sticky top-0 z-30 flex w-full bg-white shadow-1 dark:bg-boxdark">
      <div className="flex flex-grow items-center justify-between px-4 py-4 md:px-6 2xl:px-11">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="z-40 block rounded-sm border border-stroke bg-white p-1.5 shadow-sm dark:border-strokedark dark:bg-boxdark lg:hidden"
        >
          <HamburgerIcon className="h-5.5 w-5.5 text-black dark:text-white" />
        </button>

        <div className="hidden lg:block" />

        <div className="flex items-center gap-3 2xsm:gap-7">
          {selectedAccount?.mercadolivre_token_expired && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              title="O token do Mercado Livre expirou — clique para reconectar"
              className="flex items-center gap-1.5 rounded-full border-[0.5px] border-warning bg-warning/10 px-3 py-1.5 text-xs font-medium text-warning disabled:opacity-60"
            >
              {isReconnecting ? 'Reconectando...' : 'Reconectar Mercado Livre'}
            </button>
          )}

          <button
            onClick={toggleTheme}
            aria-label="Alternar tema claro/escuro"
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary dark:border-strokedark dark:bg-meta-4 dark:text-white"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-4.5 w-4.5" />
            ) : (
              <MoonIcon className="h-4.5 w-4.5" />
            )}
          </button>

          <button
            onClick={handleSync}
            disabled={!selectedAccountId || syncState === 'syncing'}
            aria-label="Atualizar dados do Mercado Livre"
            title={
              syncState === 'done'
                ? 'Sincronização solicitada'
                : syncState === 'skipped'
                  ? 'Já sincronizado recentemente'
                  : 'Atualizar pedidos, vendas e produtos com o Mercado Livre'
            }
            className="flex h-8.5 w-8.5 items-center justify-center rounded-full border-[0.5px] border-stroke bg-gray hover:text-primary disabled:opacity-50 dark:border-strokedark dark:bg-meta-4 dark:text-white"
          >
            <SyncIcon
              className={`h-4.5 w-4.5 ${syncState === 'syncing' ? 'animate-spin' : ''} ${syncState === 'done' ? 'text-success' : ''}`}
            />
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen((open) => !open)}
              className="flex items-center gap-3"
            >
              <span className="hidden text-right lg:block">
                <span className="block text-sm font-medium text-black dark:text-white">
                  {user?.name}
                </span>
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 z-40 mt-4 flex w-56 flex-col rounded-sm border border-stroke bg-white shadow-1 dark:border-strokedark dark:bg-boxdark">
                  <div className="border-b border-stroke px-4 py-3 dark:border-strokedark">
                    <p className="text-sm font-medium text-black dark:text-white">{user?.name}</p>
                    <p className="truncate text-xs text-body dark:text-bodydark">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-4 py-3 text-sm font-medium text-danger hover:bg-gray dark:hover:bg-meta-4"
                  >
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
