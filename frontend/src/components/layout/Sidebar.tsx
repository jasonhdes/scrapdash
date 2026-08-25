'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useConversations } from '@/hooks/useConversations';
import { useTheme } from '@/hooks/useTheme';
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

function ReturnsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M3 10h11a5 5 0 0 1 5 5v1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 5 3 10l5 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path d="M5 3h9l5 5v13H5V3Z" strokeLinejoin="round" />
      <path d="M9 12v5M12 9v8M15 14v3" strokeLinecap="round" />
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
  { href: '/returns', label: 'Devoluções', module: 'returns', icon: ReturnsIcon },
  { href: '/reports', label: 'Relatórios', module: 'financial', icon: ReportsIcon },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user, token } = useAuth();
  const { selectedAccount } = useAccounts(token);
  const { unreadTotal } = useConversations(selectedAccount?.id ?? null, token);
  const { theme } = useTheme();

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
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-y-hidden border-r border-stroke bg-white duration-300 ease-linear dark:border-strokedark dark:bg-sidebar-dark lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="relative px-6 py-5.5">
          <Link href="/dashboard" className="block">
            <Image
              src={theme === 'dark' ? '/card-dark.png' : '/card-light.png'}
              alt="Scrap Dash"
              width={1408}
              height={768}
              className="h-auto w-full"
              priority
            />
          </Link>
          <button
            className="absolute right-4 top-4 text-black dark:text-white lg:hidden"
            onClick={onClose}
            aria-label="Fechar menu"
          >
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

        <div className="flex flex-1 overflow-y-auto duration-300 ease-linear">
          <div className="w-2.5 shrink-0 bg-white dark:bg-sidebar-dark" />
          <nav className="mt-5 min-w-0 flex-1 px-2.5 py-4">
            <ul className="flex flex-col gap-1.5">
              {links.map((link) => {
                const active = pathname?.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={onClose}
                      className={`group relative flex items-center gap-2.5 rounded-sm py-2 pr-4 font-medium text-body duration-300 ease-in-out hover:bg-gray-2 dark:text-bodydark1 dark:hover:bg-meta-4 ${
                        active ? 'bg-gray-2 dark:bg-meta-4' : ''
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
