"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAccounts } from "@/hooks/useAccounts";
import { useDashboard } from "@/hooks/useDashboard";
import { connectMercadoLivre } from "@/services/accounts";
import type { Account } from "@/types/account";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { AccountSelector } from "@/components/dashboard/AccountSelector";
import { DateRangeFilter } from "@/components/dashboard/DateRangeFilter";
import { NavBar } from "@/components/layout/NavBar";
import styles from "@/styles/dashboard.module.css";

const DATE_RANGE_STORAGE_KEY = "scrapdash_dashboard_date_range";

function formatCurrency(value: number, currency: string | null) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: currency ?? "BRL",
  }).format(value);
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className={styles.page}><p>Carregando...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, isLoading: authLoading, logout } = useAuth();
  const { accounts, selectedAccountId, setSelectedAccountId, selectedAccount, refresh: refreshAccounts } =
    useAccounts(token);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: dashboard, isLoading: dashboardLoading } = useDashboard(
    selectedAccountId,
    token,
    startDate || null,
    endDate || null,
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    const stored = window.localStorage.getItem(DATE_RANGE_STORAGE_KEY);
    if (!stored) return;
    try {
      const { startDate: s, endDate: e } = JSON.parse(stored);
      if (s) setStartDate(s);
      if (e) setEndDate(e);
    } catch {
      // ignore malformed stored value
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({ startDate, endDate }));
  }, [startDate, endDate]);

  useEffect(() => {
    const mlConnected = searchParams.get("ml_connected");

    if (mlConnected === "1") {
      setFeedback("Conta do Mercado Livre conectada com sucesso.");
      refreshAccounts();
    } else if (mlConnected === "0") {
      const reason = searchParams.get("reason") ?? "erro_desconhecido";
      setFeedback(`Não foi possível conectar ao Mercado Livre (${reason}).`);
    }
  }, [searchParams, refreshAccounts]);

  if (authLoading || !user) {
    return (
      <div className={styles.page}>
        <p>Carregando...</p>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  async function handleConnect(account: Account) {
    if (!token) return;
    setConnectingId(account.id);
    try {
      const { redirect_url } = await connectMercadoLivre(account.id, token);
      window.location.href = redirect_url;
    } catch {
      setFeedback("Não foi possível iniciar a conexão com o Mercado Livre.");
      setConnectingId(null);
    }
  }

  const isTokenExpired = dashboard?.alerts.some((alert) => alert.type === "token_expired") ?? false;
  const needsConnect = !!selectedAccount && !selectedAccount.mercadolivre_connected;
  const needsRefresh = !!selectedAccount && selectedAccount.mercadolivre_connected && isTokenExpired;
  const isBusy = !!selectedAccount && connectingId === selectedAccount.id;

  const kpiGrid = dashboard ? (
    <div className={styles.grid}>
      <KpiCard
        label="Receita"
        value={formatCurrency(dashboard.revenue.total, dashboard.revenue.currency)}
      />
      <KpiCard label="Pedidos" value={dashboard.orders.total} />
      <KpiCard
        label="Produtos"
        value={dashboard.products.total}
        hint={`${dashboard.products.active} ativos`}
      />
      <KpiCard label="Pagamentos aprovados" value={dashboard.payments.by_status["approved"] ?? 0} />
      <KpiCard label="Mensagens" value={dashboard.messages.total} />
    </div>
  ) : null;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <NavBar />

        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Bem-vindo, {user.name}</h1>
            <p className={styles.subtitle}>
              {user.email} · perfil: {user.role}
            </p>
          </div>
          <div className={styles.connectRow}>
            <AccountSelector
              accounts={accounts}
              selectedId={selectedAccountId}
              onChange={setSelectedAccountId}
            />
            <button className={styles.linkButton} onClick={handleLogout}>
              Sair
            </button>
          </div>
        </div>

        {feedback && <p className={styles.subtitle}>{feedback}</p>}

        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onChange={({ startDate: s, endDate: e }) => {
            setStartDate(s);
            setEndDate(e);
          }}
          onClear={() => {
            setStartDate("");
            setEndDate("");
          }}
        />

        {needsConnect && (
          <div className={styles.connectRow}>
            <button className={styles.button} disabled={isBusy} onClick={() => handleConnect(selectedAccount)}>
              {isBusy ? "Conectando..." : "Conectar conta Mercado Livre"}
            </button>
          </div>
        )}

        {dashboard && dashboard.alerts.length > 0 && (
          <div className={styles.alerts}>
            {dashboard.alerts.map((alert, i) => (
              <div key={i} className={styles.alert}>
                {alert.message}
              </div>
            ))}
          </div>
        )}

        {dashboardLoading && !dashboard ? (
          <p className={styles.subtitle}>Carregando KPIs...</p>
        ) : needsRefresh ? (
          <div className={styles.blurWrapper}>
            <div className={styles.blurredContent}>{kpiGrid}</div>
            <div className={styles.blurOverlay}>
              <button className={styles.button} disabled={isBusy} onClick={() => handleConnect(selectedAccount)}>
                {isBusy ? "Atualizando..." : "Atualizar"}
              </button>
            </div>
          </div>
        ) : (
          kpiGrid
        )}
      </div>
    </div>
  );
}
