'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import LoadingHotmart from '@/components/LoadingHotmart';
import LoginPage from '@/app/login/page';
import DashboardPage from '@/app/dashboard/page';

export default function PainelPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingHotmart size="md" />
      </div>
    );
  }

  // Se não estiver logado, mostrar página de login
  if (!session) {
    return <LoginPage />;
  }

  // Se estiver logado, mostrar dashboard
  return <DashboardPage />;
}

