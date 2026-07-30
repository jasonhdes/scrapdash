'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-whiten dark:bg-boxdark-2">
        <p className="text-sm text-body dark:text-bodydark">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 dark:bg-boxdark-2">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-sm border border-stroke bg-white px-8 py-10 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
          SD
        </span>
        <h1 className="text-title-sm font-bold text-black dark:text-white">Scrap Dash</h1>
        <p className="text-sm text-body dark:text-bodydark">Gestão de vendas no Mercado Livre.</p>
        <Link
          href="/login"
          className="w-full rounded-lg bg-primary p-3 text-center font-medium text-white transition hover:bg-opacity-90"
        >
          Entrar
        </Link>
        <p className="text-sm text-body dark:text-bodydark">
          Não tem uma conta?{' '}
          <Link href="/register" className="font-medium text-primary">
            Cadastre-se
          </Link>
        </p>
      </div>
    </div>
  );
}
