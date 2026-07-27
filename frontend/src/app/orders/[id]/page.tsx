"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { getOrder, markOrderProcessed } from "@/services/orders";
import type { Order } from "@/types/order";
import { NavBar } from "@/components/layout/NavBar";
import styles from "@/styles/list.module.css";

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency ?? "BRL",
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { user, token, isLoading: authLoading } = useAuth();
  const { selectedAccountId } = useAccounts(token);

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  const loadOrder = useCallback(async () => {
    if (!selectedAccountId || !token) return;
    setIsLoading(true);
    try {
      const { data } = await getOrder(selectedAccountId, orderId, token);
      setOrder(data);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId, token, orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  async function handleToggleProcessed() {
    if (!selectedAccountId || !token || !order) return;
    setIsUpdating(true);
    try {
      const { data } = await markOrderProcessed(selectedAccountId, order.id, !order.processed_at, token);
      setOrder(data);
    } finally {
      setIsUpdating(false);
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

        <Link href="/orders" className={styles.link}>
          ← Voltar para pedidos
        </Link>

        {isLoading || !order ? (
          <p className={styles.subtitle}>Carregando pedido...</p>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <h1 className={styles.title}>Pedido {order.mercadolivre_order_id}</h1>
                <p className={styles.subtitle}>
                  Comprador: {order.buyer_nickname ?? "—"} · Status: {order.status}
                </p>
              </div>
              <button className={styles.pageButton} disabled={isUpdating} onClick={handleToggleProcessed}>
                {order.processed_at ? "Desmarcar como processado" : "Marcar como processado"}
              </button>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <tbody>
                  <tr>
                    <th>Valor total</th>
                    <td>{formatCurrency(order.total_amount, order.currency)}</td>
                  </tr>
                  <tr>
                    <th>Data do pedido</th>
                    <td>{formatDate(order.ordered_at)}</td>
                  </tr>
                  <tr>
                    <th>Processado em</th>
                    <td>{formatDate(order.processed_at)}</td>
                  </tr>
                  <tr>
                    <th>Última sincronização</th>
                    <td>{formatDate(order.synced_at)}</td>
                  </tr>
                  {order.pack_id && (
                    <tr>
                      <th>Pack</th>
                      <td>{order.pack_id}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <h2 className={styles.title} style={{ fontSize: "1.1rem" }}>
              Pagamentos
            </h2>

            {order.payments && order.payments.length > 0 ? (
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Valor</th>
                      <th>Método</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.mercadolivre_payment_id}</td>
                        <td>
                          <span className={styles.badge}>{payment.status}</span>
                        </td>
                        <td>{formatCurrency(payment.transaction_amount, order.currency)}</td>
                        <td>{payment.payment_method ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={styles.subtitle}>Nenhum pagamento sincronizado para este pedido.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
