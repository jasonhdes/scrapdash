"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { connectMercadoLivre, listAccounts } from "@/services/accounts";
import type { Account } from "@/types/account";
import styles from "@/styles/auth.module.css";

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
  const { user, token, isLoading, logout } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    if (!token) return;
    const { data } = await listAccounts(token);
    setAccounts(data);
  }, [token]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

  useEffect(() => {
    if (token) {
      loadAccounts();
    }
  }, [token, loadAccounts]);

  useEffect(() => {
    const mlConnected = searchParams.get("ml_connected");

    if (mlConnected === "1") {
      setFeedback("Conta do Mercado Livre conectada com sucesso.");
      loadAccounts();
    } else if (mlConnected === "0") {
      const reason = searchParams.get("reason") ?? "erro_desconhecido";
      setFeedback(`Não foi possível conectar ao Mercado Livre (${reason}).`);
    }
  }, [searchParams, loadAccounts]);

  if (isLoading || !user) {
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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bem-vindo, {user.name}</h1>
        <p className={styles.subtitle}>
          {user.email} · perfil: {user.role}
        </p>

        {feedback && <p className={styles.subtitle}>{feedback}</p>}

        <div className={styles.form}>
          {accounts.map((account) => (
            <div key={account.id} className={styles.field}>
              <label>{account.name}</label>
              {account.mercadolivre_connected ? (
                <span>Mercado Livre conectado ✓</span>
              ) : (
                <button
                  className={styles.submit}
                  disabled={connectingId === account.id}
                  onClick={() => handleConnect(account)}
                >
                  {connectingId === account.id ? "Conectando..." : "Conectar conta Mercado Livre"}
                </button>
              )}
            </div>
          ))}
        </div>

        <button className={styles.submit} onClick={handleLogout}>
          Sair
        </button>
      </div>
    </div>
  );
}
