'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
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
    <div className="flex min-h-screen items-center justify-center bg-whiten px-4 dark:bg-boxdark-2 sm:px-6 lg:px-8">
      <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-sm border border-stroke bg-white px-8 py-10 text-center shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="h-20 w-20 overflow-hidden rounded-lg">
          <Image
            src="/favicon.png"
            alt="Scrap Dash"
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        </div>
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
