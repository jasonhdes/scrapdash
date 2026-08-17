'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { SessionGuard } from '@/components/auth/SessionGuard';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-whiten dark:bg-boxdark-2">
        <p className="text-body dark:text-bodydark">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-whiten dark:bg-boxdark-2">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />

        <div className="flex flex-1">
          <div className="w-2.5 shrink-0 bg-whiten dark:bg-boxdark-2" />

          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
              <SessionGuard>{children}</SessionGuard>
            </div>
          </main>

          <div className="w-2.5 shrink-0 bg-whiten dark:bg-boxdark-2" />
        </div>
      </div>
    </div>
  );
}
