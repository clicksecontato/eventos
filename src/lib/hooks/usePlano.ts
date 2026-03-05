'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { FuncionalidadeService } from '../services/funcionalidade-service';
import type { PlanoStatus } from '../services/assinatura-service';
import type { Assinatura } from '@/types/funcionalidades';
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

  const criarStatusFallbackPorAssinatura = (assinatura: Assinatura | null, todasAssinaturas: Assinatura[]): PlanoStatus => {
    if (assinatura) {
      const ativo = assinatura.status === 'active' || assinatura.status === 'trial';
      return {
        plano: null,
        assinatura,
        status: assinatura.status,
        pagamentoEmDia: ativo,
        ativo,
        mensagem: ativo ? undefined : `Assinatura ${assinatura.status.toLowerCase()}`
      };
    }

    const maisRecente = todasAssinaturas.length > 0 ? todasAssinaturas[0] : null;
    if (maisRecente) {
      return {
        plano: null,
        assinatura: maisRecente,
        status: maisRecente.status,
        pagamentoEmDia: false,
        ativo: false,
        mensagem: `Assinatura ${maisRecente.status.toLowerCase()}`
      };
    }

    return {
      plano: null,
      assinatura: null,
      status: 'sem_assinatura',
      pagamentoEmDia: false,
      ativo: false,
      mensagem: 'Usuário não possui assinatura ativa'
    };
  };

  const loadData = async () => {
    if (sessionStatus !== 'authenticated' || !session?.user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const userId = session.user.id;

      const [statusResult, limitesResult] = await Promise.allSettled([
        fetch(`/api/users/${userId}/assinatura`, { cache: 'no-store' }),
        fetch('/api/limites-usuario', { cache: 'no-store' }).then(res => res.json())
      ]);

      let erroStatusPlano: string | null = null;

      if (statusResult.status === 'fulfilled') {
        const statusRes = statusResult.value;
        const statusData = await statusRes.json().catch(() => ({}));
        const status = statusRes.ok ? ((statusData.data ?? statusData)?.statusPlano ?? null) : null;

        if (status) {
          setStatusPlano(status);
        } else {
          erroStatusPlano = (statusData?.error as string) || 'Falha ao obter status do plano';
        }
      } else {
        erroStatusPlano = statusResult.reason instanceof Error ? statusResult.reason.message : 'Falha ao obter status do plano';
      }

      // Fallback robusto quando endpoint principal falhar:
      // usa /api/assinaturas para montar status mínimo e evitar falso bloqueio por erro transitório.
      if (erroStatusPlano) {
        try {
          const fallbackRes = await fetch('/api/assinaturas', { cache: 'no-store' });
          const fallbackData = await fallbackRes.json().catch(() => ({}));
          const payload = (fallbackData.data ?? fallbackData) as {
            assinatura?: Assinatura | null;
            todasAssinaturas?: Assinatura[];
          };

          const statusFallback = criarStatusFallbackPorAssinatura(
            payload.assinatura ?? null,
            payload.todasAssinaturas ?? []
          );
          setStatusPlano(statusFallback);
          setError(erroStatusPlano);
        } catch (fallbackError: unknown) {
          const fallbackMensagem = fallbackError instanceof Error ? fallbackError.message : 'Falha no fallback de assinatura';
          setError(`${erroStatusPlano}. ${fallbackMensagem}`);
          setStatusPlano(null);
        }
      } else {
        setError(null);
      }

      if (limitesResult.status === 'fulfilled') {
        const limitesResponse = limitesResult.value;
        if (limitesResponse.data?.limites) {
          setLimites(limitesResponse.data.limites);
        } else {
          setLimites({
            eventosMesAtual: 0,
            clientesTotal: 0,
            usuariosConta: 1,
            armazenamentoUsado: 0
          });
        }
      } else {
        setLimites({
          eventosMesAtual: 0,
          clientesTotal: 0,
          usuariosConta: 1,
          armazenamentoUsado: 0
        });
      }
    } catch (err: unknown) {
      const mensagemErro = err instanceof Error ? err.message : 'Erro ao carregar dados do plano';
      setError(mensagemErro);
      setStatusPlano(null);
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

