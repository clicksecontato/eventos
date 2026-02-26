'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FuncionalidadeService } from '../services/funcionalidade-service';
import type { PlanoStatus } from '../services/assinatura-service';
import { LimitesUsuario } from '@/types/funcionalidades';

export interface UsePlanoReturn {
  statusPlano: PlanoStatus | null;
  limites: LimitesUsuario | null;
  temPermissao: (codigoFuncionalidade: string) => Promise<boolean>;
  podeCriar: (tipo: 'eventos' | 'clientes') => Promise<{ pode: boolean; motivo?: string; limite?: number; usado?: number; restante?: number }>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function usePlano(): UsePlanoReturn {
  const { data: session, status: sessionStatus } = useSession();
  const [statusPlano, setStatusPlano] = useState<PlanoStatus | null>(null);
  const [limites, setLimites] = useState<LimitesUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const funcionalidadeService = new FuncionalidadeService();

  const loadData = async () => {
    if (sessionStatus !== 'authenticated' || !session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = session.user.id;

      // Carregar status do plano e limites em paralelo via API (bypassa regras do Firestore no cliente)
      const [statusRes, limitesResponse] = await Promise.all([
        fetch(`/api/users/${userId}/assinatura`),
        fetch('/api/limites-usuario').then(res => res.json())
      ]);

      const statusData = await statusRes.json().catch(() => ({}));
      const status = statusRes.ok ? ((statusData.data ?? statusData)?.statusPlano ?? null) : null;
      setStatusPlano(status);

      // Extrair limites da resposta da API
      if (limitesResponse.data?.limites) {
        setLimites(limitesResponse.data.limites);
      } else {
        // Fallback: valores padrão
        setLimites({
          eventosMesAtual: 0,
          clientesTotal: 0,
          usuariosConta: 1,
          armazenamentoUsado: 0
        });
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do plano');
      // Em caso de erro, definir valores padrão
      setLimites({
        eventosMesAtual: 0,
        clientesTotal: 0,
        usuariosConta: 1,
        armazenamentoUsado: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionStatus === 'authenticated' && session?.user?.id) {
      loadData();
    } else if (sessionStatus === 'unauthenticated') {
      setLoading(false);
      setStatusPlano(null);
      setLimites(null);
    }
  }, [sessionStatus, session?.user?.id]);

  const temPermissao = async (codigoFuncionalidade: string): Promise<boolean> => {
    if (!session?.user?.id) return false;
    return funcionalidadeService.verificarPermissao(session.user.id, codigoFuncionalidade);
  };

  const podeCriar = async (tipo: 'eventos' | 'clientes'): Promise<{ pode: boolean; motivo?: string; limite?: number; usado?: number; restante?: number }> => {
    if (!session?.user?.id) {
      return { pode: false, motivo: 'Usuário não autenticado' };
    }
    return funcionalidadeService.verificarPodeCriar(session.user.id, tipo);
  };

  return {
    statusPlano,
    limites,
    temPermissao,
    podeCriar,
    loading,
    error,
    refresh: loadData
  };
}

