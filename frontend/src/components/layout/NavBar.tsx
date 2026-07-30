'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useConversations } from '@/hooks/useConversations';
import type { PermissionModule } from '@/types/employee';
import styles from '@/styles/nav.module.css';

const LINKS: { href: string; label: string; module?: PermissionModule }[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/products', label: 'Produtos', module: 'products' },
  { href: '/orders', label: 'Pedidos', module: 'orders' },
  { href: '/financial', label: 'Financeiro', module: 'financial' },
  { href: '/messages', label: 'Mensagens', module: 'messages' },
];

export function NavBar() {
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
    links.push({ href: '/employees', label: 'Funcionários' });
  }

  return (
    <nav className={styles.nav}>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname?.startsWith(link.href) ? styles.activeLink : styles.link}
        >
          {link.label}
          {link.href === '/messages' && unreadTotal > 0 && (
            <span className={styles.badge}>{unreadTotal}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}
