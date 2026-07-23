"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import styles from "@/styles/auth.module.css";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleCredential(credential: string) {
    setError(null);
    try {
      await loginWithGoogle(credential);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar com o Google.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Entrar</h1>
          <p className={styles.subtitle}>Acesse sua conta do Scrap Dash.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />

        <p className={styles.footer}>
          Não tem uma conta? <Link href="/register">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
