"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import styles from "@/styles/auth.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [isLoading, user, router]);

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

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Bem-vindo, {user.name}</h1>
        <p className={styles.subtitle}>
          {user.email} · perfil: {user.role}
        </p>
        <button className={styles.submit} onClick={handleLogout}>
          Sair
        </button>
      </div>
    </div>
  );
}
