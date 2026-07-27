"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { listProducts } from "@/services/products";
import type { Product } from "@/types/product";
import { AccountSelector } from "@/components/dashboard/AccountSelector";
import { NavBar } from "@/components/layout/NavBar";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { Pagination } from "@/components/shared/Pagination";
import styles from "@/styles/list.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "active", label: "Ativo" },
  { value: "paused", label: "Pausado" },
  { value: "under_review", label: "Em revisão" },
  { value: "inactive", label: "Inativo" },
];

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency ?? "BRL",
  }).format(value);
}

export default function ProductsPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);

  const [products, setProducts] = useState<Product[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const loadProducts = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const response = await listProducts(selectedAccountId, token, { status, search, page });
      setProducts(response.data);
      setMeta(response.meta);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, status, search, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  if (authLoading || !user) {
    return (
      <div className={styles.page}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <NavBar />

        <SessionGuard>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Produtos</h1>
              <p className={styles.subtitle}>Anúncios sincronizados do Mercado Livre.</p>
            </div>
            <AccountSelector accounts={accounts} selectedId={selectedAccountId} onChange={setSelectedAccountId} />
          </div>

          <div className={styles.filters}>
            <div className={styles.field}>
              <label htmlFor="search">Buscar</label>
              <input
                id="search"
                type="text"
                placeholder="Título do produto"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isLoading && products.length === 0 ? (
            <p className={styles.subtitle}>Carregando produtos...</p>
          ) : products.length === 0 ? (
            <p className={styles.subtitle}>Nenhum produto encontrado.</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th></th>
                    <th>Título</th>
                    <th>Preço</th>
                    <th>Estoque</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {product.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.thumbnail} alt="" className={styles.thumb} />
                        )}
                      </td>
                      <td>
                        <a href={product.permalink ?? "#"} target="_blank" rel="noopener noreferrer" className={styles.link}>
                          {product.title}
                        </a>
                      </td>
                      <td>{formatCurrency(product.price, product.currency)}</td>
                      <td>{product.available_quantity}</td>
                      <td>
                        <span className={styles.badge}>{product.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            currentPage={meta.current_page}
            lastPage={meta.last_page}
            total={meta.total}
            onChange={setPage}
          />
        </SessionGuard>
      </div>
    </div>
  );
}
