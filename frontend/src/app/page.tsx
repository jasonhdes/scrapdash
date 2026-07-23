"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import styles from "@/styles/auth.module.css";

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className={styles.page}>
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Scrap Dash</h1>
        <p className={styles.subtitle}>Gestão de vendas no Mercado Livre.</p>
        <Link href="/login" className={styles.submit} style={{ textAlign: "center" }}>
          Entrar
        </Link>
        <p className={styles.footer}>
          Não tem uma conta? <Link href="/register">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
