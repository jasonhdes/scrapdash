"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

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
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 py-10 dark:bg-boxdark-2">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="hidden w-full flex-col justify-center bg-primary px-10 py-16 text-white xl:flex xl:w-1/2">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/15 text-lg font-bold">
            SD
          </span>
          <h2 className="mb-3 text-title-md font-bold">Scrap Dash</h2>
          <p className="max-w-xs text-bodydark1">
            Gestão de vendas do Mercado Livre: pedidos, produtos, financeiro e mensagens em um só lugar.
          </p>
        </div>

        <div className="w-full px-6 py-10 sm:px-10 xl:w-1/2">
          <h1 className="mb-2 text-title-sm font-bold text-black dark:text-white">Entrar</h1>
          <p className="mb-6 text-sm text-body dark:text-bodydark">Acesse sua conta do Scrap Dash.</p>

          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-black dark:text-white">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-medium text-black dark:text-white">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary p-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-60"
            >
              {isSubmitting ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-5">
            <GoogleSignInButton onCredential={handleGoogleCredential} text="signin_with" />
          </div>

          <p className="mt-6 text-center text-sm text-body dark:text-bodydark">
            Não tem uma conta?{" "}
            <Link href="/register" className="font-medium text-primary">
              Cadastre-se
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
