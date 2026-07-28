"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { exportOrdersCsv, getSkuOptions, listOrders, markOrderProcessed } from "@/services/orders";
import type { OrderSortColumn, SkuOption } from "@/services/orders";
import type { Order } from "@/types/order";
import { AccountSelector } from "@/components/dashboard/AccountSelector";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { NavBar } from "@/components/layout/NavBar";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { Pagination } from "@/components/shared/Pagination";
import { BRASILIA_TIMEZONE, formatReleaseDate } from "@/utils/format";
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

const RELEASED_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "1", label: "Liberado" },
  { value: "0", label: "Pendente" },
];

const EMPTY_TEXT_FILTERS = { orderNumber: "", buyer: "", product: "", location: "", minTotal: "", maxTotal: "" };

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency ?? "BRL",
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR", { timeZone: BRASILIA_TIMEZONE });
}

function formatLocation(city: string | null, state: string | null) {
  if (!city && !state) return "—";
  if (city && state) return `${city}/${state}`;
  return city ?? state ?? "—";
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, token, isLoading: authLoading } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId } = useAccounts(token);

  const [textFiltersInput, setTextFiltersInput] = useState(EMPTY_TEXT_FILTERS);
  const [textFilters, setTextFilters] = useState(EMPTY_TEXT_FILTERS);
  const [status, setStatus] = useState("");
  const [released, setReleased] = useState("");
  const [processed, setProcessed] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [sortBy, setSortBy] = useState<OrderSortColumn | undefined>(undefined);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
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

  useEffect(() => {
    const timeout = setTimeout(() => {
      setTextFilters(textFiltersInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [textFiltersInput]);

  useEffect(() => {
    if (!selectedAccountId || !token) return;
    getSkuOptions(selectedAccountId, token).then(({ data }) => setSkuOptions(data));
  }, [selectedAccountId, token]);

  const filters = {
    orderNumber: textFilters.orderNumber || undefined,
    buyer: textFilters.buyer || undefined,
    product: textFilters.product || undefined,
    skus: selectedSkus.length > 0 ? selectedSkus : undefined,
    location: textFilters.location || undefined,
    minTotal: textFilters.minTotal || undefined,
    maxTotal: textFilters.maxTotal || undefined,
    status: status || undefined,
    released: released === "" ? undefined : released === "1",
    processed: processed === "" ? undefined : processed === "1",
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    sortBy,
    sortDir,
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
  }, [
    selectedAccountId,
    token,
    textFilters,
    selectedSkus,
    status,
    released,
    processed,
    startDate,
    endDate,
    sortBy,
    sortDir,
    page,
  ]);

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

  function clearFilters() {
    setTextFiltersInput(EMPTY_TEXT_FILTERS);
    setStatus("");
    setReleased("");
    setProcessed("");
    setStartDate("");
    setEndDate("");
    setSelectedSkus([]);
    setSortBy(undefined);
    setSortDir("desc");
    setPage(1);
  }

  function handleSort(column: OrderSortColumn) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIndicator(column: OrderSortColumn) {
    if (sortBy !== column) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
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

        <SessionGuard>
          <div className={styles.header}>
            <div>
              <h1 className={styles.title}>Pedidos</h1>
              <p className={styles.subtitle}>Pedidos sincronizados do Mercado Livre.</p>
            </div>
            <AccountSelector accounts={accounts} selectedId={selectedAccountId} onChange={setSelectedAccountId} />
          </div>

          <div className={styles.filters}>
            <div className={styles.field}>
              <label htmlFor="order_number">Pedido</label>
              <input
                id="order_number"
                type="text"
                placeholder="Número do pedido"
                value={textFiltersInput.orderNumber}
                onChange={(e) => setTextFiltersInput((f) => ({ ...f, orderNumber: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="buyer">Comprador</label>
              <input
                id="buyer"
                type="text"
                placeholder="Apelido do comprador"
                value={textFiltersInput.buyer}
                onChange={(e) => setTextFiltersInput((f) => ({ ...f, buyer: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="location">Cidade/Estado</label>
              <input
                id="location"
                type="text"
                placeholder="Ex.: São Paulo"
                value={textFiltersInput.location}
                onChange={(e) => setTextFiltersInput((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="product">Produto</label>
              <input
                id="product"
                type="text"
                placeholder="Nome do produto"
                value={textFiltersInput.product}
                onChange={(e) => setTextFiltersInput((f) => ({ ...f, product: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="skus">SKU (selecione um ou mais)</label>
              <select
                id="skus"
                multiple
                size={4}
                className={styles.skuSelect}
                value={selectedSkus}
                onChange={(e) => {
                  setSelectedSkus(Array.from(e.target.selectedOptions, (o) => o.value));
                  setPage(1);
                }}
              >
                {skuOptions.map((option) => (
                  <option key={option.sku} value={option.sku}>
                    {option.sku} — {option.title}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="min_total">Valor mín.</label>
              <input
                id="min_total"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={textFiltersInput.minTotal}
                onChange={(e) => setTextFiltersInput((f) => ({ ...f, minTotal: e.target.value }))}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="max_total">Valor máx.</label>
              <input
                id="max_total"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={textFiltersInput.maxTotal}
                onChange={(e) => setTextFiltersInput((f) => ({ ...f, maxTotal: e.target.value }))}
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
            <div className={styles.field}>
              <label htmlFor="released">Liberação</label>
              <select
                id="released"
                value={released}
                onChange={(e) => {
                  setReleased(e.target.value);
                  setPage(1);
                }}
              >
                {RELEASED_OPTIONS.map((option) => (
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
            <button className={styles.pageButton} onClick={clearFilters}>
              Limpar filtros
            </button>
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
                    <th className={styles.sortableTh} onClick={() => handleSort("mercadolivre_order_id")}>
                      Pedido{sortIndicator("mercadolivre_order_id")}
                    </th>
                    <th className={styles.sortableTh} onClick={() => handleSort("buyer_nickname")}>
                      Comprador{sortIndicator("buyer_nickname")}
                    </th>
                    <th>Cidade/Estado</th>
                    <th>Produtos</th>
                    <th className={styles.sortableTh} onClick={() => handleSort("total_amount")}>
                      Valor{sortIndicator("total_amount")}
                    </th>
                    <th className={styles.sortableTh} onClick={() => handleSort("status")}>
                      Status{sortIndicator("status")}
                    </th>
                    <th className={styles.sortableTh} onClick={() => handleSort("ordered_at")}>
                      Data{sortIndicator("ordered_at")}
                    </th>
                    <th className={styles.sortableTh} onClick={() => handleSort("money_release_date")}>
                      Liberação{sortIndicator("money_release_date")}
                    </th>
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
                      <td>{formatLocation(order.buyer_city, order.buyer_state)}</td>
                      <td className={styles.productList}>
                        {order.items && order.items.length > 0
                          ? order.items.map((item) => (
                              <div key={item.id}>
                                {item.title} {item.seller_sku ? `(SKU: ${item.seller_sku})` : ""} x{item.quantity}
                              </div>
                            ))
                          : "—"}
                      </td>
                      <td>{formatCurrency(order.total_amount, order.currency)}</td>
                      <td>
                        <span className={styles.badge}>{order.status}</span>
                      </td>
                      <td>{formatDate(order.ordered_at)}</td>
                      <td>{formatReleaseDate(order.money_release_date, order.money_released)}</td>
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
        </SessionGuard>
      </div>
    </div>
  );
}
