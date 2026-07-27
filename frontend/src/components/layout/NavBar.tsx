"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/styles/nav.module.css";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/products", label: "Produtos" },
  { href: "/orders", label: "Pedidos" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname?.startsWith(link.href) ? styles.activeLink : styles.link}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
