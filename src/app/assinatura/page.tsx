'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { Assinatura, Plano, Funcionalidade, CategoriaFuncionalidade } from '@/types/funcionalidades';
import { CheckIcon, ClockIcon, XCircleIcon, DocumentTextIcon, ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { usePlano } from '@/lib/hooks/usePlano';
import LimiteUso from '@/components/LimiteUso';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import LoadingHotmart from '@/components/LoadingHotmart';

export default function AssinaturaPage() {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [todasAssinaturas, setTodasAssinaturas] = useState<Assinatura[]>([]);
  const [historicoConsolidado, setHistoricoConsolidado] = useState<any[]>([]);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [funcionalidades, setFuncionalidades] = useState<Funcionalidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { limites, loading: loadingLimites } = usePlano();
  const { showToast } = useToast();

  useEffect(() => {
    loadAssinatura();
  }, []);

  const loadAssinatura = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/assinaturas');
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        setAssinatura(null);
        setTodasAssinaturas([]);
        return;
      }
      
      const responseData = await res.json();
      
      // A API retorna { data: { assinatura, todasAssinaturas } } devido ao createApiResponse
      const apiData = responseData.data || responseData;
      
      // Armazenar todas as assinaturas
      const todasAssinaturasArray = apiData.todasAssinaturas || [];
      if (Array.isArray(todasAssinaturasArray) && todasAssinaturasArray.length > 0) {
        setTodasAssinaturas(todasAssinaturasArray);
        
        // Consolidar histórico de todas as assinaturas
        const historico: any[] = [];
        todasAssinaturasArray.forEach((ass: Assinatura) => {
          if (ass.historico && Array.isArray(ass.historico)) {
            ass.historico.forEach((evento) => {
              historico.push({
                ...evento,
                assinaturaId: ass.id,
                assinaturaStatus: ass.status
              });
            });
          }
        });
        
        // Ordenar por data (mais recente primeiro)
        historico.sort((a, b) => {
          const getDate = (date: any): Date => {
            if (date && typeof date === 'object' && 'seconds' in date) {
              const seconds = (date as any).seconds;
              const nanoseconds = (date as any).nanoseconds || 0;
              return new Date(seconds * 1000 + nanoseconds / 1000000);
            }
            return new Date(date);
          };
          
          const dataA = getDate(a.data);
          const dataB = getDate(b.data);
          return dataB.getTime() - dataA.getTime();
        });
        
        setHistoricoConsolidado(historico);
      } else {
        setTodasAssinaturas([]);
        setHistoricoConsolidado([]);
      }
      
      // Processar assinatura ativa
      const assinaturaAtiva = apiData.assinatura || null;
      if (assinaturaAtiva) {
        setAssinatura(assinaturaAtiva);
        
        // Carregar detalhes do plano
        if (assinaturaAtiva.planoId) {
          try {
            const planoRes = await fetch(`/api/planos/${assinaturaAtiva.planoId}`);
            if (planoRes.ok) {
              const planoResponseData = await planoRes.json();
              
              // A API retorna { data: { plano } } devido ao createApiResponse
              const planoData = planoResponseData.data || planoResponseData;
              const planoObj = planoData.plano || planoData;
              
              if (planoObj) {
                setPlano(planoObj);
              }
            }
          } catch (error) {
            // Erro silencioso
          }
        }

        // Carregar detalhes das funcionalidades habilitadas
        if (assinaturaAtiva.funcionalidadesHabilitadas && Array.isArray(assinaturaAtiva.funcionalidadesHabilitadas) && assinaturaAtiva.funcionalidadesHabilitadas.length > 0) {
          try {
            const funcRes = await fetch('/api/funcionalidades/por-ids', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids: assinaturaAtiva.funcionalidadesHabilitadas })
            });
            
            if (funcRes.ok) {
              const funcResponseData = await funcRes.json();
              
              // A API retorna { data: { funcionalidades } } devido ao createApiResponse
              const funcData = funcResponseData.data || funcResponseData;
              const funcionalidadesArray = funcData.funcionalidades || funcData;
              
              if (Array.isArray(funcionalidadesArray) && funcionalidadesArray.length > 0) {
                setFuncionalidades(funcionalidadesArray);
              } else {
                setFuncionalidades([]);
              }
            }
          } catch (error) {
            // Erro silencioso
          }
        } else {
          setFuncionalidades([]);
        }
      } else {
        setAssinatura(null);
        setPlano(null);
        setFuncionalidades([]);
      }
    } catch (error) {
      setAssinatura(null);
      setTodasAssinaturas([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      trial: { text: 'Trial', color: 'bg-info-bg text-info-text', icon: ClockIcon },
      active: { text: 'Ativa', color: 'bg-success-bg text-success-text', icon: CheckIcon },
      cancelled: { text: 'Cancelada', color: 'bg-warning-bg text-warning-text', icon: ClockIcon },
      expired: { text: 'Expirada', color: 'bg-error-bg text-error-text', icon: XCircleIcon },
      suspended: { text: 'Suspensa', color: 'bg-surface text-text-secondary', icon: XCircleIcon }
    };

    const badge = badges[status as keyof typeof badges] || badges.expired;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="h-4 w-4" />
        {badge.text}
      </span>
    );
  };

  const formatDate = (date?: Date | string | any) => {
    if (!date) return 'N/A';
    
    // Se for Timestamp do Firestore
    if (date && typeof date === 'object' && 'seconds' in date) {
      const d = new Date(date.seconds * 1000 + (date.nanoseconds || 0) / 1000000);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Se for string
    if (typeof date === 'string') {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Se for Date
    if (date instanceof Date) {
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    // Tentar converter para Date
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'N/A';
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const formatarDetalhes = (acao: string, detalhes: any): { titulo: string; items: { label: string; value: string }[] } => {
    if (!detalhes || typeof detalhes !== 'object') {
      return { titulo: acao, items: [] };
    }

    const items: { label: string; value: string }[] = [];

    // Status
    if (detalhes.status) {
      const statusLabels: Record<string, string> = {
        'active': 'Ativa',
        'trial': 'Trial',
        'cancelled': 'Cancelada',
        'expired': 'Expirada',
        'suspended': 'Suspensa'
      };
      items.push({
        label: 'Status',
        value: statusLabels[detalhes.status] || detalhes.status
      });
    }

    // Plano
    if (detalhes.plano) {
      items.push({
        label: 'Plano',
        value: detalhes.plano
      });
    }

    // Valor
    if (detalhes.valor || detalhes.preco) {
      const valor = detalhes.valor || detalhes.preco;
      items.push({
        label: 'Valor',
        value: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(valor))
      });
    }

    // Período
    if (detalhes.periodo || detalhes.intervalo) {
      const periodo = detalhes.periodo || detalhes.intervalo;
      const periodoLabel = periodo === 'mensal' ? 'Mensal' : periodo === 'anual' ? 'Anual' : periodo;
      items.push({
        label: 'Período',
        value: periodoLabel
      });
    }

    // Motivo
    if (detalhes.motivo) {
      items.push({
        label: 'Motivo',
        value: detalhes.motivo
      });
    }

    // Data
    if (detalhes.data) {
      items.push({
        label: 'Data',
        value: formatDate(detalhes.data)
      });
    }

    // Campos genéricos que não foram tratados acima
    Object.keys(detalhes).forEach(key => {
      if (!['status', 'plano', 'valor', 'preco', 'periodo', 'intervalo', 'motivo', 'data'].includes(key)) {
        const value = detalhes[key];
        if (value !== null && value !== undefined) {
          items.push({
            label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1'),
            value: typeof value === 'object' ? JSON.stringify(value) : String(value)
          });
        }
      }
    });

    return { titulo: acao, items };
  };

  const getAcaoIcon = (acao: string) => {
    const acaoLower = acao.toLowerCase();
    
    if (acaoLower.includes('criada') || acaoLower.includes('criado')) {
      return <CheckIcon className="h-5 w-5 text-success-text" />;
    }
    if (acaoLower.includes('atualizada') || acaoLower.includes('atualizado')) {
      return <ArrowPathIcon className="h-5 w-5 text-info-text" />;
    }
    if (acaoLower.includes('cancelada') || acaoLower.includes('cancelado')) {
      return <XCircleIcon className="h-5 w-5 text-error-text" />;
    }
    if (acaoLower.includes('expirada') || acaoLower.includes('expirado')) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-warning-text" />;
    }
    if (acaoLower.includes('renovada') || acaoLower.includes('renovado')) {
      return <ClockIcon className="h-5 w-5 text-success-text" />;
    }
    
    return <DocumentTextIcon className="h-5 w-5 text-text-secondary" />;
  };

  const getAcaoColor = (acao: string) => {
    const acaoLower = acao.toLowerCase();
    
    if (acaoLower.includes('criada') || acaoLower.includes('renovada')) {
      return 'bg-success-bg border-success-border';
    }
    if (acaoLower.includes('atualizada')) {
      return 'bg-info-bg border-info-border';
    }
    if (acaoLower.includes('cancelada') || acaoLower.includes('expirada')) {
      return 'bg-error-bg border-error-border';
    }
    if (acaoLower.includes('suspensa')) {
      return 'bg-warning-bg border-warning-border';
    }
    
    return 'bg-surface border-border';
  };

  if (loading || loadingLimites) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingHotmart size="sm" />
        </div>
      </Layout>
    );
  }

  // Se não há assinatura ativa, mas há histórico, mostrar histórico
  const temHistorico = historicoConsolidado.length > 0;
  const nuncaTevePlano = !assinatura && !temHistorico;

  if (!assinatura && nuncaTevePlano) {
    return (
      <Layout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Minha Assinatura</h1>
            <p className="text-text-secondary">Gerencie sua assinatura</p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-text-secondary mb-4">Você não possui uma assinatura ativa.</p>
                <Button onClick={() => window.location.href = '/planos'}>
                  Ver Planos Disponíveis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Minha Assinatura</h1>
          <p className="text-text-secondary">Gerencie sua assinatura e funcionalidades</p>
        </div>

        {assinatura && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Informações da Assinatura */}
            <Card>
              <CardHeader>
                <CardTitle>Assinatura Atual</CardTitle>
                <CardDescription>Informações sobre sua assinatura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-primary">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(assinatura.status)}
                  </div>
                </div>

                {plano && (
                  <>
                    <div>
                      <label className="text-sm font-medium text-text-primary">Plano</label>
                      <p className="mt-1 text-lg font-semibold text-text-primary">{plano.nome}</p>
                      <p className="text-sm text-text-secondary">{plano.descricao}</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-text-primary">Valor</label>
                      <p className="mt-1 text-2xl font-bold text-primary">
                        R$ {plano.preco.toFixed(2)} / {plano.intervalo}
                      </p>
                    </div>
                  </>
                )}

                <div>
                  <label className="text-sm font-medium text-text-primary">Data de Início</label>
                  <p className="mt-1 text-text-secondary">{formatDate(assinatura.dataInicio)}</p>
                </div>

                {assinatura.dataFim && (
                  <div>
                    <label className="text-sm font-medium text-text-primary">Data de Fim</label>
                    <p className="mt-1 text-text-secondary">{formatDate(assinatura.dataFim)}</p>
                  </div>
                )}

                {assinatura.dataRenovacao && (
                  <div>
                    <label className="text-sm font-medium text-text-primary">Próxima Renovação</label>
                    <p className="mt-1 text-text-secondary">{formatDate(assinatura.dataRenovacao)}</p>
                  </div>
                )}

                {assinatura.status === 'trial' && assinatura.dataFim && (
                  <div className="p-4 bg-info-bg rounded-md">
                    <p className="text-sm text-info-text">
                      <strong>Período Trial:</strong> Sua assinatura expira em {formatDate(assinatura.dataFim)}.
                      Após esta data, o valor será cobrado automaticamente.
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-text-primary">ID Hotmart</label>
                  <p className="mt-1 text-sm font-mono text-text-muted">{assinatura.hotmartSubscriptionId}</p>
                </div>
              </CardContent>
            </Card>

            {/* Funcionalidades Habilitadas */}
            <Card>
              <CardHeader>
                <CardTitle>Funcionalidades Disponíveis</CardTitle>
                <CardDescription>Funcionalidades habilitadas no seu plano</CardDescription>
              </CardHeader>
              <CardContent>
                {funcionalidades.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-text-muted text-center py-4">
                      {assinatura.funcionalidadesHabilitadas.length === 0 
                        ? 'Nenhuma funcionalidade habilitada'
                        : 'Carregando funcionalidades...'}
                    </p>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.location.href = '/planos'}
                    >
                      Ver Detalhes do Plano
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-text-secondary">
                      {funcionalidades.length} funcionalidade(s) ativa(s)
                    </p>
                    
                    {/* Agrupar por categoria */}
                    {(() => {
                      const categorias: Record<CategoriaFuncionalidade, Funcionalidade[]> = {
                        'EVENTOS': [],
                        'FINANCEIRO': [],
                        'RELATORIOS': [],
                        'INTEGRACAO': [],
                        'ADMIN': []
                      };

                      funcionalidades.forEach(func => {
                        if (categorias[func.categoria]) {
                          categorias[func.categoria].push(func);
                        }
                      });

                      const categoriasComFunc = Object.entries(categorias).filter(([_, funcs]) => funcs.length > 0);

                      return (
                        <div className="space-y-4">
                          {categoriasComFunc.map(([categoria, funcs]) => (
                            <div key={categoria} className="space-y-2">
                              <h4 className="text-sm font-semibold text-text-primary uppercase">
                                {categoria === 'EVENTOS' && '📅 '}
                                {categoria === 'FINANCEIRO' && '💰 '}
                                {categoria === 'RELATORIOS' && '📊 '}
                                {categoria === 'INTEGRACAO' && '🔗 '}
                                {categoria === 'ADMIN' && '⚙️ '}
                                {categoria}
                              </h4>
                              <div className="space-y-1 pl-4">
                                {funcs.map(func => (
                                  <div key={func.id} className="flex items-start gap-2 py-1">
                                    <CheckIcon className="h-4 w-4 text-success-text mt-0.5 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-text-primary">{func.nome}</p>
                                      {func.descricao && (
                                        <p className="text-xs text-text-secondary mt-0.5">{func.descricao}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    <Button 
                      variant="outline" 
                      className="w-full mt-4"
                      onClick={() => window.location.href = '/planos'}
                    >
                      Ver Todos os Planos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Limites de Uso */}
        {limites && (limites.eventosLimiteMes || limites.clientesLimite || limites.usuariosLimite || limites.armazenamentoLimite) && (
          <Card>
            <CardHeader>
              <CardTitle>Limites de Uso</CardTitle>
              <CardDescription>Consumo atual dos recursos do seu plano</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {limites.eventosLimiteMes !== undefined && (
                  <LimiteUso
                    tipo="eventos"
                    usado={limites.eventosMesAtual}
                    limite={limites.eventosLimiteMes}
                    periodo="mes"
                  />
                )}
                {limites.clientesLimite !== undefined && (
                  <LimiteUso
                    tipo="clientes"
                    usado={limites.clientesTotal}
                    limite={limites.clientesLimite}
                    periodo="total"
                  />
                )}
                {limites.usuariosLimite !== undefined && (
                  <LimiteUso
                    tipo="usuarios"
                    usado={limites.usuariosConta}
                    limite={limites.usuariosLimite}
                    periodo="total"
                  />
                )}
                {limites.armazenamentoLimite !== undefined && (
                  <LimiteUso
                    tipo="armazenamento"
                    usado={limites.armazenamentoUsado}
                    limite={limites.armazenamentoLimite}
                    periodo="total"
                    unidade="GB"
                  />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Histórico - Exibir se houver histórico na assinatura ativa ou histórico consolidado */}
        {((assinatura?.historico && assinatura.historico.length > 0) || historicoConsolidado.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Assinaturas</CardTitle>
              <CardDescription>
                {!assinatura && temHistorico 
                  ? 'Histórico completo das suas assinaturas anteriores' 
                  : 'Eventos relacionados à sua assinatura'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!assinatura && temHistorico && (
                <div className="mb-4 p-4 bg-warning-bg border border-warning-border rounded-lg">
                  <p className="text-sm text-warning-text">
                    <strong>Você não possui uma assinatura ativa no momento.</strong> Abaixo está o histórico completo das suas assinaturas anteriores para fins de auditoria.
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                {(historicoConsolidado.length > 0 ? historicoConsolidado : (assinatura?.historico || []))
                  .map((evento, index) => {
                    const detalhesFormatados = formatarDetalhes(evento.acao, evento.detalhes);
                    const bgColor = getAcaoColor(evento.acao);
                    
                    return (
                      <div 
                        key={index} 
                        className={`flex items-start gap-4 p-4 border rounded-lg hover:shadow-md transition-all ${bgColor}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          {getAcaoIcon(evento.acao)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-text-primary mb-1">
                                {detalhesFormatados.titulo}
                              </p>
                              <p className="text-xs text-text-secondary mb-2">
                                {formatDate(evento.data)}
                              </p>
                              
                              {detalhesFormatados.items.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {detalhesFormatados.items.map((item, itemIndex) => (
                                    <div key={itemIndex} className="flex items-start gap-2">
                                      <span className="text-xs font-medium text-text-secondary min-w-[80px]">
                                        {item.label}:
                                      </span>
                                      <span className="text-xs text-text-primary flex-1">
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Ações</CardTitle>
            <CardDescription>Gerenciar sua assinatura</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => window.location.href = '/planos'}
            >
              Ver Planos Disponíveis
            </Button>
            {assinatura && (assinatura.status === 'active' || assinatura.status === 'trial') && (
              <>
                <Button 
                  variant="outline" 
                  className="w-full text-error hover:text-error-text hover:bg-error-bg"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancelar Assinatura
                </Button>
                <ConfirmationDialog
                  open={showCancelDialog}
                  onOpenChange={setShowCancelDialog}
                  title="Cancelar Assinatura"
                  description="Tem certeza que deseja cancelar sua assinatura? Para cancelar sua assinatura, acesse sua conta na Hotmart ou entre em contato com o suporte."
                  confirmText="Entendi"
                  cancelText="Fechar"
                  variant="destructive"
                  onConfirm={() => {
                    showToast('Para cancelar sua assinatura, acesse sua conta na Hotmart ou entre em contato com o suporte.', 'info', 8000);
                  }}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

