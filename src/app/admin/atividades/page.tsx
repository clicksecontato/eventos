'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  UserPlusIcon,
  CreditCardIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
type TipoAtividade = 'novo_cadastro' | 'nova_assinatura' | 'cancelamento';

interface Atividade {
  tipo: TipoAtividade;
  nome: string;
  email: string;
  data: Date | string;
  detalhes: string;
}

const TIPO_CONFIG: Record<
  TipoAtividade,
  { label: string; Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  novo_cadastro: {
    label: 'Novo Cadastro',
    Icon: UserPlusIcon,
    className: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
  },
  nova_assinatura: {
    label: 'Nova Assinatura',
    Icon: CreditCardIcon,
    className: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
  },
  cancelamento: {
    label: 'Cancelamento',
    Icon: XCircleIcon,
    className: 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
  }
};

function formatarData(data: string | Date): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export default function AdminAtividadesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAtividades = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/atividades');
      const json = await res.json();
      if (!res.ok) {
        setAtividades([]);
        return;
      }
      const list = Array.isArray(json?.data) ? json.data : [];
      setAtividades(list);
    } catch {
      setAtividades([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/painel');
      return;
    }
    if (session?.user?.role !== 'admin') {
      router.push('/painel');
      return;
    }
    loadAtividades();
  }, [status, session?.user?.role, router, loadAtividades]);

  useEffect(() => {
    if (session?.user?.role !== 'admin') return;
    const interval = setInterval(loadAtividades, 30 * 1000);
    return () => clearInterval(interval);
  }, [session?.user?.role, loadAtividades]);

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">Carregando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Atividades Recentes</h1>
          <p className="text-text-secondary">Monitoramento de cadastros e assinaturas</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Últimas atividades</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-text-secondary">Carregando atividades...</div>
            ) : atividades.length === 0 ? (
              <div className="py-12 text-center text-text-secondary">
                Nenhuma atividade recente.
              </div>
            ) : (
              <>
                {/* Tabela: visível em md+ */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-text-primary">Tipo</th>
                        <th className="text-left py-3 px-2 font-medium text-text-primary">Nome</th>
                        <th className="text-left py-3 px-2 font-medium text-text-primary">Email</th>
                        <th className="text-left py-3 px-2 font-medium text-text-primary">Data/hora</th>
                        <th className="text-left py-3 px-2 font-medium text-text-primary">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atividades.map((a, i) => {
                        const config = TIPO_CONFIG[a.tipo];
                        const Icon = config.Icon;
                        return (
                          <tr key={i} className="border-b border-border/70 hover:bg-surface-hover/50">
                            <td className="py-3 px-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md ${config.className}`}
                              >
                                <Icon className="h-4 w-4 flex-shrink-0" />
                                {config.label}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-text-primary">{a.nome}</td>
                            <td className="py-3 px-2 text-text-secondary">{a.email}</td>
                            <td className="py-3 px-2 text-text-secondary whitespace-nowrap">
                              {formatarData(a.data)}
                            </td>
                            <td className="py-3 px-2 text-text-secondary">{a.detalhes || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Cards: visíveis apenas em mobile */}
                <div className="md:hidden space-y-3">
                  {atividades.map((a, i) => {
                    const config = TIPO_CONFIG[a.tipo];
                    const Icon = config.Icon;
                    return (
                      <div
                        key={i}
                        className="p-4 rounded-lg border border-border bg-surface/50 space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${config.className}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {config.label}
                          </span>
                          <span className="text-xs text-text-muted">{formatarData(a.data)}</span>
                        </div>
                        <p className="font-medium text-text-primary">{a.nome}</p>
                        <p className="text-sm text-text-secondary">{a.email}</p>
                        {a.detalhes ? (
                          <p className="text-sm text-text-secondary">Plano: {a.detalhes}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
