'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useConversations } from '@/hooks/useConversations';
import type { PermissionModule } from '@/types/employee';

type NavItem = {
  href: string;
  label: string;
  module?: PermissionModule;
  icon: (props: { className?: string }) => React.ReactElement;
};

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        d="M3 13h8V3H3v10Zm10 8h8V9h-8v12Zm-10 0h8v-6H3v6ZM13 3v4h8V3h-8Z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M21 8 12 3 3 8l9 5 9-5Z" strokeLinejoin="round" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" strokeLinejoin="round" />
    </svg>
  );
}

function OrdersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M6 2h9l3 3v17H6V2Z" strokeLinejoin="round" />
      <path d="M9 9h6M9 13h6M9 17h4" strokeLinecap="round" />
    </svg>
  );
}

function FinancialIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="12" cy="12" r="9" />
      <path
        d="M12 7v10M9.5 9.5c0-1.4 1.1-2.5 2.5-2.5s2.5.9 2.5 2c0 3-5 1.5-5 4.5 0 1.1 1.1 2 2.5 2s2.5-1.1 2.5-2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MessagesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M4 5h16v11H8l-4 4V5Z" strokeLinejoin="round" />
    </svg>
  );
}

function EmployeesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <circle cx="9" cy="8" r="3.2" />
      <path
        d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 8.5a3 3 0 1 1 3 3M21 20c0-2.6-2-4.8-4.5-5.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

const LINKS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/products', label: 'Produtos', module: 'products', icon: ProductsIcon },
  { href: '/orders', label: 'Pedidos', module: 'orders', icon: OrdersIcon },
  { href: '/financial', label: 'Financeiro', module: 'financial', icon: FinancialIcon },
  { href: '/messages', label: 'Mensagens', module: 'messages', icon: MessagesIcon },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, token } = useAuth();
  const { selectedAccount } = useAccounts(token);
  const { unreadTotal } = useConversations(selectedAccount?.id ?? null, token);

  const links = LINKS.filter((link) => {
    if (!link.module) return true;
    if (!selectedAccount) return true;
    return (selectedAccount.permissions[link.module] ?? []).includes('view');
  });

  if (user && user.role !== 'user_partner') {
    links.push({ href: '/employees', label: 'Funcionários', icon: EmployeesIcon });
  }

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden bg-black duration-300 ease-linear dark:bg-boxdark lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-5.5">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm">
              SD
            </span>
            Scrap Dash
          </Link>
          <button className="text-white lg:hidden" onClick={onClose} aria-label="Fechar menu">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col overflow-y-auto duration-300 ease-linear">
          <nav className="mt-5 px-4 py-4">
            <ul className="flex flex-col gap-1.5">
              {links.map((link) => {
                const active = pathname?.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className={`group relative flex items-center gap-2.5 rounded-sm px-4 py-2 font-medium text-bodydark1 duration-300 ease-in-out hover:bg-graydark dark:hover:bg-meta-4 ${
                        active ? 'bg-graydark dark:bg-meta-4' : ''
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {link.label}
                      {link.href === '/messages' && unreadTotal > 0 && (
                        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-white">
                          {unreadTotal}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}
