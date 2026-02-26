'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LockClosedIcon } from '@heroicons/react/24/solid';
import { usePlano } from '@/lib/hooks/usePlano';
import { Button } from '@/components/ui/button';

export default function PlanOverlay({ children }: { children: React.ReactNode }) {
  const { statusPlano, loading } = usePlano();
  const router = useRouter();
  const temPlanoAtivo = statusPlano?.ativo === true;

  if (loading || temPlanoAtivo) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[2px]">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-50 bg-background/80 backdrop-blur-sm">
        <div className="bg-surface border border-border rounded-lg shadow-lg p-8 max-w-md mx-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-amber-500/10 p-3">
              <LockClosedIcon className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Funcionalidade bloqueada
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            Adquira um plano para acessar esta funcionalidade
          </p>
          <Button
            onClick={() => router.push('/planos')}
            className="w-full sm:w-auto"
          >
            Ver Planos Disponíveis
          </Button>
        </div>
      </div>
    </div>
  );
}
