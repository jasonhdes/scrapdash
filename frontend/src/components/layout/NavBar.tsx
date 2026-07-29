"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useConversations } from "@/hooks/useConversations";
import styles from "@/styles/nav.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Produtos" },
  { href: "/orders", label: "Pedidos" },
  { href: "/financial", label: "Financeiro" },
  { href: "/messages", label: "Mensagens" },
];

export function NavBar() {
  const pathname = usePathname();
  const { token } = useAuth();
  const { selectedAccountId } = useAccounts(token);
  const { unreadTotal } = useConversations(selectedAccountId, token);

  return (
    <nav className={styles.nav}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname?.startsWith(link.href) ? styles.activeLink : styles.link}
        >
          {link.label}
          {link.href === "/messages" && unreadTotal > 0 && <span className={styles.badge}>{unreadTotal}</span>}
        </Link>
      ))}
    </nav>
  );
}
