'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckIcon, SparklesIcon, ChartBarIcon, CalendarIcon, UserGroupIcon, CurrencyDollarIcon, ShieldCheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import LoadingHotmart from '@/components/LoadingHotmart';
import { Plano, Funcionalidade } from '@/types/funcionalidades';
import ThemeToggle from '@/components/ThemeToggle';
import { useToast } from '@/components/ui/toast';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [funcionalidadesMap, setFuncionalidadesMap] = useState<Record<string, Funcionalidade>>({});
  const [planoComFuncionalidades, setPlanoComFuncionalidades] = useState<Record<string, Funcionalidade[]>>({});
  const [loadingPlanos, setLoadingPlanos] = useState(true);
  const router = useRouter();
  const { data: session, status } = useSession();
  const { showToast } = useToast();

  useEffect(() => {
    setMounted(true);
    loadPlanos();
  }, []);

  useEffect(() => {
    // Carregar funcionalidades quando planos estiverem disponíveis
    if (planos.length > 0 && Object.keys(funcionalidadesMap).length === 0) {
      loadFuncionalidades();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planos]);

  useEffect(() => {
    // Se logado, redirecionar para /painel
    if (mounted && status !== 'loading' && session) {
      router.push('/painel');
    }
  }, [session, status, router, mounted]);

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
    setLoadingPlanos(true);
    try {
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
        const planosOrdenados = planosArray
          .filter((p: Plano) => p.ativo)
          .sort((a: Plano, b: Plano) => {
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
      setLoadingPlanos(false);
    }
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

  // Mapeamento de códigos de planos para links de pagamento da Hotmart (igual /planos)
  const linksPagamentoHotmart: Record<string, string> = {
    'BASICO_MENSAL': 'https://pay.hotmart.com/E102958850J?off=8i552qn2',
    'PROFISSIONAL_MENSAL': 'https://pay.hotmart.com/E102958850J?off=muk2aovg',
    'PREMIUM_MENSAL': 'https://pay.hotmart.com/E102958850J?off=edavff1s',
  };

  const handleAssinar = (plano: Plano) => {
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
    window.location.href = linkPagamento;
  };

  if (!mounted || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingHotmart size="md" />
      </div>
    );
  }

  // Se logado, não renderizar (será redirecionado)
  if (session) {
    return null;
  }

  const beneficios = [
    {
      icon: CalendarIcon,
      title: 'Gestão de Eventos',
      description: 'Organize todos os seus eventos em um só lugar. Controle datas, horários e detalhes com facilidade.'
    },
    {
      icon: UserGroupIcon,
      title: 'Controle de Clientes',
      description: 'Mantenha um cadastro completo de clientes com histórico de eventos e interações.'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Gestão Financeira',
      description: 'Controle pagamentos, receitas e despesas. Relatórios financeiros completos para tomar decisões.'
    },
    {
      icon: ChartBarIcon,
      title: 'Relatórios Avançados',
      description: 'Análises detalhadas do seu negócio com gráficos e métricas em tempo real.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Segurança Total',
      description: 'Seus dados protegidos com criptografia e backups automáticos.'
    },
    {
      icon: ClockIcon,
      title: 'Economia de Tempo',
      description: 'Automatize processos e foque no que realmente importa: seu negócio.'
    }
  ];

  const depoimentos = [
    {
      nome: 'Maria Silva',
      empresa: 'Fotos & Eventos',
      texto: 'O Clicksehub transformou completamente a gestão do meu negócio. Agora consigo controlar tudo de forma muito mais organizada.',
      avaliacao: 5
    },
    {
      nome: 'João Santos',
      empresa: 'Studio Premium',
      texto: 'Os relatórios financeiros são incríveis. Consigo ver exatamente onde está o dinheiro e tomar decisões melhores.',
      avaliacao: 5
    },
    {
      nome: 'Ana Costa',
      empresa: 'Eventos VIP',
      texto: 'A facilidade de uso é impressionante. Em poucos dias já estava dominando todas as funcionalidades.',
      avaliacao: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image 
              src="/logo.png" 
              alt="Clicksehub Logo" 
              width={40} 
              height={40}
              className="object-contain"
            />
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Clickse</span>
              <span style={{ color: '#FF4001' }}>hub</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              onClick={() => router.push('/painel')}
              variant="outline"
            >
              Entrar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-bold text-text-primary mb-6">
            Gestão Completa para{' '}
            <span className="text-primary">Empresas de Cabine de Fotos</span>
          </h2>
          <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
            Simplifique a gestão do seu negócio. Controle eventos, clientes, pagamentos e muito mais em uma única plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => router.push('/painel')}
              className="btn-add text-lg px-8 py-6"
            >
              Começar Agora
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="text-lg px-8 py-6"
            >
              Ver Planos
            </Button>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="container mx-auto px-4 py-20 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-text-primary text-center mb-12">
            Por que escolher o Clicksehub?
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {beneficios.map((beneficio, index) => {
              const Icon = beneficio.icon;
              return (
                <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-text-primary mb-2">
                          {beneficio.title}
                        </h4>
                        <p className="text-text-secondary text-sm">
                          {beneficio.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-text-primary mb-12">
            Como Funciona
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h4 className="text-xl font-semibold text-text-primary">Crie sua Conta</h4>
              <p className="text-text-secondary">
                Cadastre-se em minutos e comece a usar imediatamente
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h4 className="text-xl font-semibold text-text-primary">Escolha seu Plano</h4>
              <p className="text-text-secondary">
                Selecione o plano ideal para o tamanho do seu negócio
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h4 className="text-xl font-semibold text-text-primary">Comece a Usar</h4>
              <p className="text-text-secondary">
                Organize seus eventos e clientes de forma profissional
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Depoimentos */}
      <section className="container mx-auto px-4 py-20 bg-surface/30">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-3xl font-bold text-text-primary text-center mb-12">
            O que nossos clientes dizem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {depoimentos.map((depoimento, index) => (
              <Card key={index} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(depoimento.avaliacao)].map((_, i) => (
                      <span key={i} className="text-yellow-500">★</span>
                    ))}
                  </div>
                  <p className="text-text-secondary mb-4 italic">
                    "{depoimento.texto}"
                  </p>
                  <div>
                    <p className="font-semibold text-text-primary">{depoimento.nome}</p>
                    <p className="text-sm text-text-secondary">{depoimento.empresa}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="container mx-auto px-4 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-text-primary mb-4">
              Planos que Cabem no Seu Bolso
            </h3>
            <p className="text-text-secondary text-lg">
              Escolha o plano ideal para o seu negócio
            </p>
          </div>

          {loadingPlanos ? (
            <div className="flex justify-center py-12">
              <LoadingHotmart size="sm" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
              {planos.map((plano) => {
                const funcionalidades = getPlanoFuncionalidades(plano);
                const categorias = agruparFuncionalidadesPorCategoria(funcionalidades);

                return (
                  <Card
                    key={plano.id}
                    className={`relative transition-all hover:shadow-xl flex flex-col h-full ${
                      plano.nome.toLowerCase().includes('profissional') ? 'border-2 border-primary scale-105' : ''
                    }`}
                  >
                    {plano.nome.toLowerCase().includes('profissional') && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-10">
                        <span className="bg-primary text-white px-4 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-lg">
                          <SparklesIcon className="h-3 w-3" />
                          Popular
                        </span>
                      </div>
                    )}

                    <CardHeader>
                      <CardTitle className="text-2xl">{plano.nome}</CardTitle>
                      <CardDescription>{plano.descricao}</CardDescription>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-text-primary">
                          {formatarPreco(plano.preco)}
                        </span>
                        <span className="text-text-secondary ml-2">
                          / {plano.intervalo === 'mensal' ? 'mês' : 'ano'}
                        </span>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-col flex-1 space-y-4">
                      {/* Limites */}
                      {(plano.limiteEventos || plano.limiteClientes || plano.limiteUsuarios || plano.limiteArmazenamento) && (
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
                              <p>• {plano.limiteUsuarios} usuário(s)</p>
                            )}
                            {plano.limiteArmazenamento && (
                              <p>• {plano.limiteArmazenamento} GB armazenamento</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Funcionalidades */}
                      {Object.keys(categorias).length > 0 ? (
                        <div className="space-y-3 flex-1 min-h-0">
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
                                      <CheckIcon className="h-4 w-4 text-success mt-0.5 flex-shrink-0" strokeWidth={3} />
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
                            {funcionalidades.length === 0 ? 'Carregando funcionalidades...' : 'Sem funcionalidades definidas'}
                          </p>
                        </div>
                      )}

                      {/* Botão CTA - redireciona para aquisição (Hotmart) igual /planos */}
                      <div className="pt-4 mt-auto">
                        <Button
                          className={plano.nome.toLowerCase().includes('profissional') ? 'btn-add w-full' : 'w-full'}
                          onClick={() => handleAssinar(plano)}
                          size="lg"
                        >
                          {plano.nome.toLowerCase().includes('profissional') ? 'Assinar Agora' : 'Escolher Plano'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {!loadingPlanos && planos.length === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">Planos em breve...</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Final */}
      <section className="container mx-auto px-4 py-20 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-3xl font-bold text-text-primary mb-4">
            Pronto para transformar seu negócio?
          </h3>
          <p className="text-text-secondary text-lg mb-8">
            Comece hoje mesmo e veja a diferença que uma gestão profissional faz.
          </p>
          <Button 
            size="lg"
            onClick={() => router.push('/painel')}
            className="btn-add text-lg px-8 py-6"
          >
            Começar Agora - Grátis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface/50 py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3">
            <Image 
              src="/logo.png" 
              alt="Clicksehub Logo" 
              width={32} 
              height={32}
              className="object-contain"
            />
            <span className="text-text-secondary">
              <span className="text-primary font-bold">Clickse</span>
              <span style={{ color: '#FF4001' }} className="font-bold">hub</span>
            </span>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex flex-wrap justify-center gap-4 text-sm text-text-secondary">
              <Link 
                href="/politica-privacidade"
                className="hover:text-primary transition-colors underline"
              >
                Política de Privacidade
              </Link>
              <span className="text-text-muted">•</span>
              <Link 
                href="/termos-uso"
                className="hover:text-primary transition-colors underline"
              >
                Termos de Uso
              </Link>
            </div>
            <div className="text-center text-sm text-text-muted">
              <p>© {new Date().getFullYear()} Clicksehub. Todos os direitos reservados.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
