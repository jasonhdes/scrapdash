"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import styles from "@/styles/auth.module.css";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogleCredential(credential: string) {
    setError(null);
    try {
      await loginWithGoogle(credential);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta com o Google.");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        name,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError && err.errors) {
        setError(Object.values(err.errors).flat().join(" "));
      } else {
        setError(err instanceof ApiError ? err.message : "Não foi possível criar a conta. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div>
          <h1 className={styles.title}>Criar conta</h1>
          <p className={styles.subtitle}>Comece a usar o Scrap Dash.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">Nome</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

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
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password_confirmation">Confirmar senha</label>
            <input
              id="password_confirmation"
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? "Criando conta..." : "Criar conta"}
          </button>
        </form>

        <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />

        <p className={styles.footer}>
          Já tem uma conta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
