"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { ApiError } from "@/services/api";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

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
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 py-10 dark:bg-boxdark-2 sm:px-6 lg:px-8">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="hidden w-full flex-col justify-center items-center bg-primary px-10 py-16 text-white xl:flex xl:w-1/2">
          <div className="mb-4 h-20 w-20 overflow-hidden rounded-lg">
            <Image
              src="/favicon.png"
              alt="Scrap Dash"
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="mb-3 text-title-md font-bold">Scrap Dash</h2>
          <p className="max-w-xs text-bodydark1">
            Gestão de vendas do Mercado Livre: pedidos, produtos, financeiro e mensagens em um só lugar.
          </p>
        </div>

        <div className="w-full px-6 py-10 sm:px-10 xl:w-1/2 items-center justify-center flex flex-col">
          <div className="w-full max-w-sm">
            <h1 className="mb-2 mt-8 text-center text-title-sm font-bold text-black dark:text-white">
              Criar conta
            </h1>
            <p className="mb-6 text-center text-sm text-body dark:text-bodydark">Comece a usar o Scrap Dash.</p>

            <div className="flex w-full flex-col gap-8">
              <form className="flex w-full flex-col gap-3" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium text-black dark:text-white">
                    Nome
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    autoComplete="name"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

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
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password_confirmation"
                    className="mb-2 block text-sm font-medium text-black dark:text-white"
                  >
                    Confirmar senha
                  </label>
                  <input
                    id="password_confirmation"
                    type="password"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-stroke bg-transparent px-4 py-3 text-black outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                {error && <p className="text-sm text-danger">{error}</p>}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-primary p-3 font-medium text-white transition hover:bg-opacity-90 disabled:opacity-60"
                >
                  {isSubmitting ? "Criando conta..." : "Criar conta"}
                </button>
              </form>

              <GoogleSignInButton onCredential={handleGoogleCredential} text="signup_with" />
            </div>

            <p className="mt-6 text-center text-sm text-body dark:text-bodydark">
              Já tem uma conta?{" "}
              <Link href="/login" className="font-medium text-primary">
                Entrar
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
