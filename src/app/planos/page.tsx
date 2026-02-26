'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { Plano, Funcionalidade } from '@/types/funcionalidades';
import { CheckIcon, XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { usePlano } from '@/lib/hooks/usePlano';
import LimiteUso from '@/components/LimiteUso';
import { useToast } from '@/components/ui/toast';

export default function PlanosPage() {
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [funcionalidadesMap, setFuncionalidadesMap] = useState<Record<string, Funcionalidade>>({});
  const [loading, setLoading] = useState(true);
  const { statusPlano, limites } = usePlano();
  const [planoComFuncionalidades, setPlanoComFuncionalidades] = useState<Record<string, Funcionalidade[]>>({});
  const { showToast } = useToast();

  useEffect(() => {
    loadPlanos();
  }, []);

  useEffect(() => {
    // Carregar funcionalidades quando planos estiverem disponíveis
    if (planos.length > 0 && Object.keys(funcionalidadesMap).length === 0) {
      loadFuncionalidades();
    }
  }, [planos]);

  const loadFuncionalidades = async () => {
    try {
      const funcs: Funcionalidade[] = [];
      const funcMap = new Map<string, Funcionalidade>();

      for (const plano of planos) {
        if (plano.funcionalidades && plano.funcionalidades.length > 0) {
          try {
            const res = await fetch(`/api/planos/${plano.id}`);
            const data = await res.json();
            // createApiResponse retorna { data: { plano } }, compatível com { plano }
            const planoData = (data.data ?? data)?.plano;
            if (planoData?.funcionalidadesDetalhes) {
              planoData.funcionalidadesDetalhes.forEach((f: Funcionalidade) => {
                if (!funcMap.has(f.id)) {
                  funcMap.set(f.id, f);
                  funcs.push(f);
                }
              });
            }
          } catch (error) {
            // Erro silencioso
          }
        }
      }

      const map: Record<string, Funcionalidade> = {};
      funcs.forEach(func => {
        map[func.id] = func;
      });
      setFuncionalidadesMap(map);

      const planoFuncMap: Record<string, Funcionalidade[]> = {};
      for (const plano of planos) {
        const planoFuncs: Funcionalidade[] = [];
        for (const funcId of plano.funcionalidades) {
          if (map[funcId]) {
            planoFuncs.push(map[funcId]);
          }
        }
        planoFuncMap[plano.id] = planoFuncs;
      }
      setPlanoComFuncionalidades(planoFuncMap);
    } catch (error) {
      // Erro silencioso
    }
  };

  const loadPlanos = async () => {
    setLoading(true);
    try {
      // Buscar planos ativos
      const res = await fetch('/api/planos?ativos=true');
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setPlanos([]);
        return;
      }
      
      const responseData = await res.json();
      
      // A API retorna { data: { planos: [...] } } devido ao createApiResponse
      const planosArray = responseData.data?.planos || responseData.planos || [];
      
      if (Array.isArray(planosArray) && planosArray.length > 0) {
        const planosOrdenados = planosArray.sort((a: Plano, b: Plano) => {
          // Ordenar por destaque primeiro, depois por preço
          if (a.destaque && !b.destaque) return -1;
          if (!a.destaque && b.destaque) return 1;
          return a.preco - b.preco;
        });
        setPlanos(planosOrdenados);
      } else {
        setPlanos([]);
      }
    } catch (error) {
      setPlanos([]);
    } finally {
      setLoading(false);
    }
  };

  const isPlanoAtual = (planoId?: string) => {
    return statusPlano?.plano?.id === planoId;
  };

  const getPlanoFuncionalidades = (plano: Plano): Funcionalidade[] => {
    return planoComFuncionalidades[plano.id] || [];
  };

  const agruparFuncionalidadesPorCategoria = (funcs: Funcionalidade[]) => {
    const categorias: Record<string, Funcionalidade[]> = {};
    funcs.forEach(func => {
      if (!categorias[func.categoria]) {
        categorias[func.categoria] = [];
      }
      categorias[func.categoria].push(func);
    });
    return categorias;
  };

  const formatarPreco = (preco: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(preco);
  };

  // Mapeamento de códigos de planos para links de pagamento da Hotmart
  const linksPagamentoHotmart: Record<string, string> = {
    'BASICO_MENSAL': 'https://pay.hotmart.com/E102958850J?off=8i552qn2',
    'PROFISSIONAL_MENSAL': 'https://pay.hotmart.com/E102958850J?off=muk2aovg',
    'PREMIUM_MENSAL': 'https://pay.hotmart.com/E102958850J?off=edavff1s',
  };

  const handleAssinar = (plano: Plano) => {
    // Verificar se o plano tem código Hotmart e link de pagamento configurado
    if (!plano.codigoHotmart) {
      showToast('Plano não possui código Hotmart configurado', 'error');
      return;
    }

    const linkPagamento = linksPagamentoHotmart[plano.codigoHotmart];
    
    if (!linkPagamento) {
      showToast(
        `Link de pagamento não configurado para o plano ${plano.nome}. Código: ${plano.codigoHotmart}`,
        'error',
        8000
      );
      return;
    }

    // Redirecionar para a página de pagamento da Hotmart
    window.location.href = linkPagamento;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Planos Disponíveis</h1>
          <p className="text-text-secondary">Escolha o plano ideal para seu negócio</p>
        </div>

        {/* Resumo do Plano Atual */}
        {statusPlano?.plano && (
          <Card className="border-primary border-2 mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Seu Plano Atual</CardTitle>
                  <CardDescription>Gerencie sua assinatura atual</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/assinatura'}
                >
                  Ver Detalhes
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-primary">{statusPlano.plano.nome}</p>
                  <p className="text-sm text-text-secondary mt-1">{statusPlano.plano.descricao}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-text-primary">
                    {formatarPreco(statusPlano.plano.preco)} / {statusPlano.plano.intervalo === 'mensal' ? 'mês' : 'ano'}
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Status: <span className="font-semibold text-success-text">
                      {statusPlano.status === 'active' ? 'Ativo' : statusPlano.status === 'trial' ? 'Trial' : 'Inativo'}
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planos.map((plano) => {
            const funcionalidades = getPlanoFuncionalidades(plano);
            const categorias = agruparFuncionalidadesPorCategoria(funcionalidades);
            const planoAtual = isPlanoAtual(plano.id);

            return (
              <Card
                key={plano.id}
                className={`relative transition-all hover:shadow-lg flex flex-col ${
                  plano.destaque ? 'border-2 border-primary scale-105' : ''
                } ${planoAtual ? 'border-2 border-success' : ''}`}
              >
                {plano.nome.toLowerCase().includes('profissional') && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                    <span className="bg-[#10b981] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      <SparklesIcon className="h-3 w-3" />
                      Popular
                    </span>
                  </div>
                )}

                {planoAtual && (
                  <div className="absolute -top-3 right-3 z-10">
                    <span className="bg-[#3b82f6] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                      Atual
                    </span>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-xl">{plano.nome}</CardTitle>
                  <CardDescription>{plano.descricao}</CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-text-primary">
                      {formatarPreco(plano.preco)}
                    </span>
                    <span className="text-text-secondary ml-2">
                      / {plano.intervalo === 'mensal' ? 'mês' : 'ano'}
                    </span>
                  </div>
                </CardHeader>

                <CardContent className="flex flex-col flex-1 space-y-4">
                  {/* Limites */}
                  {(plano.limiteEventos || plano.limiteClientes) && (
                    <div className="space-y-2 p-3 bg-surface rounded-lg">
                      <p className="text-sm font-semibold text-text-primary">Limites:</p>
                      <div className="space-y-1 text-sm text-text-secondary">
                        {plano.limiteEventos && (
                          <p>• {plano.limiteEventos} eventos/mês</p>
                        )}
                        {plano.limiteClientes && (
                          <p>• {plano.limiteClientes} clientes/ano</p>
                        )}
                        {plano.limiteUsuarios && (
                          <p>• {plano.limiteUsuarios} usuários</p>
                        )}
                        {plano.limiteArmazenamento && (
                          <p>• {plano.limiteArmazenamento} GB armazenamento</p>
                        )}
                        {!plano.limiteEventos && !plano.limiteClientes && !plano.limiteUsuarios && (
                          <p>• Sem limites configurados</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Funcionalidades */}
                  {Object.keys(categorias).length > 0 ? (
                    <div className="space-y-3 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        Funcionalidades Incluídas:
                      </p>
                      <div className="space-y-2">
                        {Object.entries(categorias).map(([categoria, funcs]) => (
                          <div key={categoria} className="space-y-1">
                            <p className="text-xs font-medium text-text-secondary uppercase">
                              {categoria}
                            </p>
                            <div className="space-y-1 pl-2">
                              {funcs.map(func => (
                                <div key={func.id} className="flex items-start gap-2">
                                  <CheckIcon className="h-5 w-5 text-[#10b981] mt-0.5 flex-shrink-0 font-bold" strokeWidth={3} />
                                  <p className="text-xs text-text-secondary">{func.nome}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 flex-1">
                      <p className="text-sm text-text-secondary">
                        {funcionalidades.length === 0 ? 'Sem funcionalidades definidas' : 'Carregando funcionalidades...'}
                      </p>
                    </div>
                  )}

                  {/* Botão de Ação - sempre no bottom */}
                  <div className="pt-4 mt-auto">
                    {planoAtual ? (
                      <Button
                        variant="outline"
                        className="w-full"
                        disabled
                      >
                        Plano Atual
                      </Button>
                    ) : (
                      <Button
                        className="w-full bg-primary hover:bg-accent hover:text-white cursor-pointer"
                        onClick={() => handleAssinar(plano)}
                      >
                        {plano.destaque ? 'Assinar Agora' : 'Escolher Plano'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {planos.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-text-secondary mb-4">Nenhum plano disponível no momento.</p>
                <Button onClick={() => window.location.href = '/assinatura'}>
                  Ver Minha Assinatura
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

