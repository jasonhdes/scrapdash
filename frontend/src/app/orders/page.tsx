"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { exportOrdersCsv, listOrders, markOrderProcessed } from "@/services/orders";
import type { Order } from "@/types/order";
import { AccountSelector } from "@/components/dashboard/AccountSelector";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { NavBar } from "@/components/layout/NavBar";
import { Pagination } from "@/components/shared/Pagination";
import styles from "@/styles/list.module.css";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "paid", label: "Pago" },
  { value: "cancelled", label: "Cancelado" },
  { value: "partially_refunded", label: "Parcialmente reembolsado" },
];

const PROCESSED_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "0", label: "Não processados" },
  { value: "1", label: "Processados" },
];

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency ?? "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [status, setStatus] = useState("");
  const [processed, setProcessed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);

  const [orders, setOrders] = useState<Order[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const filters = {
    status: status || undefined,
    processed: processed === "" ? undefined : processed === "1",
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
  };

  const loadOrders = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const response = await listOrders(selectedAccountId, token, filters);
      setOrders(response.data);
      setMeta(response.meta);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, token, status, processed, startDate, endDate, page]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  async function handleToggleProcessed(order: Order) {
    if (!selectedAccountId || !token) return;
    setUpdatingId(order.id);
    try {
      await markOrderProcessed(selectedAccountId, order.id, !order.processed_at, token);
      await loadOrders();
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleExport() {
    if (!selectedAccountId || !token) return;
    setIsExporting(true);
    try {
      await exportOrdersCsv(selectedAccountId, token, filters);
    } finally {
      setIsExporting(false);
    }
  }

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

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Pedidos</h1>
            <p className={styles.subtitle}>Pedidos sincronizados do Mercado Livre.</p>
          </div>
          <AccountSelector accounts={accounts} selectedId={selectedAccountId} onChange={setSelectedAccountId} />
        </div>

        <div className={styles.filters}>
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
          <div className={styles.field}>
            <label htmlFor="processed">Processamento</label>
            <select
              id="processed"
              value={processed}
              onChange={(e) => {
                setProcessed(e.target.value);
                setPage(1);
              }}
            >
              {PROCESSED_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onChange={({ startDate: s, endDate: e }) => {
              setStartDate(s);
              setEndDate(e);
              setPage(1);
            }}
            onClear={() => {
              setStartDate("");
              setEndDate("");
              setPage(1);
            }}
          />
          <button className={styles.pageButton} disabled={isExporting} onClick={handleExport}>
            {isExporting ? "Exportando..." : "Exportar CSV"}
          </button>
        </div>

        {isLoading && orders.length === 0 ? (
          <p className={styles.subtitle}>Carregando pedidos...</p>
        ) : orders.length === 0 ? (
          <p className={styles.subtitle}>Nenhum pedido encontrado.</p>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Comprador</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Processado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/orders/${order.id}`} className={styles.link}>
                        {order.mercadolivre_order_id}
                      </Link>
                    </td>
                    <td>{order.buyer_nickname ?? "—"}</td>
                    <td>{formatCurrency(order.total_amount, order.currency)}</td>
                    <td>
                      <span className={styles.badge}>{order.status}</span>
                    </td>
                    <td>{formatDate(order.ordered_at)}</td>
                    <td>{order.processed_at ? "Sim" : "Não"}</td>
                    <td>
                      <button
                        className={styles.pageButton}
                        disabled={updatingId === order.id}
                        onClick={() => handleToggleProcessed(order)}
                      >
                        {order.processed_at ? "Desmarcar" : "Marcar processado"}
                      </button>
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
      </div>
    </div>
  );
}
