'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/toast';
import { ModeloContrato, Evento } from '@/types';
import { ContratoService } from '@/lib/services/contrato-service';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import LoadingHotmart from '@/components/LoadingHotmart';
import TemplateEditor from '@/components/TemplateEditor';
import ContractPreview from '@/components/ContractPreview';
import {
  extrairPlaceholdersDoTemplate,
  inferirTipoCampo,
  gerarLabelVariavel,
} from '@/lib/utils/template-variables';

interface CampoDinamico {
  chave: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'currency' | 'textarea' | 'select';
  tipoVariavel: 'unica' | 'multipla';
  categoria: 'configuracao' | 'evento' | 'customizada' | 'outro';
  obrigatorio: boolean;
  opcoes?: string[];
}

interface MetadadosVariaveis {
  configuracoes: string[];
  customizadas: { chave: string; tipo: 'unica' | 'multipla' }[];
  evento: string[];
}

function gerarCamposDinamicos(
  modelo: ModeloContrato,
  metadados: MetadadosVariaveis | null
): CampoDinamico[] {
  const { unicas, multiplas } = extrairPlaceholdersDoTemplate(modelo.template);

  const chavesVistas = new Set<string>();
  const chavesOrdenadas: { chave: string; isMultipla: boolean }[] = [];

  for (const chave of unicas) {
    if (chave.startsWith('#') || chave === 'if') continue;
    if (!chavesVistas.has(chave)) {
      chavesVistas.add(chave);
      chavesOrdenadas.push({ chave, isMultipla: false });
    }
  }
  for (const chave of multiplas) {
    if (!chavesVistas.has(chave)) {
      chavesVistas.add(chave);
      chavesOrdenadas.push({ chave, isMultipla: true });
    }
  }

  const configSet = new Set(metadados?.configuracoes || []);
  const eventoSet = new Set(metadados?.evento || []);
  const customMap = new Map((metadados?.customizadas || []).map(c => [c.chave, c.tipo]));
  const camposMap = new Map(modelo.campos.map(c => [c.chave, c]));

  return chavesOrdenadas.map(({ chave, isMultipla }) => {
    const campoModelo = camposMap.get(chave);
    const customTipo = customMap.get(chave);

    let categoria: CampoDinamico['categoria'] = 'outro';
    if (configSet.has(chave)) categoria = 'configuracao';
    else if (eventoSet.has(chave)) categoria = 'evento';
    else if (customMap.has(chave)) categoria = 'customizada';

    const efetivamenteMultipla = isMultipla || customTipo === 'multipla';
    const tipo = campoModelo?.tipo ?? inferirTipoCampo(chave, efetivamenteMultipla);

    return {
      chave,
      label: campoModelo?.label || gerarLabelVariavel(chave),
      tipo,
      tipoVariavel: efetivamenteMultipla ? 'multipla' as const : 'unica' as const,
      categoria,
      obrigatorio: campoModelo?.obrigatorio ?? false,
      opcoes: campoModelo?.opcoes,
    };
  });
}

const CATEGORIA_LABELS: Record<CampoDinamico['categoria'], string> = {
  configuracao: 'Dados da Empresa',
  evento: 'Dados do Evento / Cliente',
  customizada: 'Campos Personalizados',
  outro: 'Outras Variáveis',
};

const CATEGORIA_ORDEM: CampoDinamico['categoria'][] = ['evento', 'configuracao', 'customizada', 'outro'];

function NovoContratoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const eventoId = searchParams.get('eventoId');

  const [passo, setPasso] = useState(1);
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [modeloSelecionado, setModeloSelecionado] = useState<ModeloContrato | null>(null);
  const [evento, setEvento] = useState<Evento | null>(null);
  const [dadosPreenchidos, setDadosPreenchidos] = useState<Record<string, any>>({});
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [conteudoEditado, setConteudoEditado] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(true);
  const [configExistente, setConfigExistente] = useState<boolean | null>(null);
  const [metadadosVariaveis, setMetadadosVariaveis] = useState<MetadadosVariaveis | null>(null);

  const camposDinamicos = useMemo(() => {
    if (!modeloSelecionado) return [];
    return gerarCamposDinamicos(modeloSelecionado, metadadosVariaveis);
  }, [modeloSelecionado, metadadosVariaveis]);

  useEffect(() => {
    loadModelos();
    if (eventoId) {
      loadEvento();
    }
  }, [eventoId]);

  useEffect(() => {
    if (modeloSelecionado && Object.keys(dadosPreenchidos).length > 0) {
      gerarPreview();
    }
  }, [modeloSelecionado, dadosPreenchidos]);

  const loadModelos = async () => {
    try {
      setLoadingModelos(true);
      const response = await fetch('/api/modelos-contrato');
      if (response.ok) {
        const result = await response.json();
        const modelosData = result.data || result;
        const modelosArray = Array.isArray(modelosData) ? modelosData : [];
        setModelos(modelosArray);
        
        if (modelosArray.length === 0) {
          const seedResponse = await fetch('/api/seed/modelos-contrato', { method: 'POST' });
          if (seedResponse.ok) {
            const seedData = await seedResponse.json();
            if (seedData.success) {
              showToast('Modelos de contrato inicializados!', 'success');
              const reloadResponse = await fetch('/api/modelos-contrato');
              if (reloadResponse.ok) {
                const reloadResult = await reloadResponse.json();
                const reloadModelos = reloadResult.data || reloadResult;
                setModelos(Array.isArray(reloadModelos) ? reloadModelos : []);
              }
            }
          }
        }
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Erro ao carregar modelos', 'error');
      }
    } catch (error) {
      showToast('Erro ao carregar modelos', 'error');
    } finally {
      setLoadingModelos(false);
    }
  };

  const loadEvento = async () => {
    try {
      const response = await fetch(`/api/eventos/${eventoId}`);
      if (response.ok) {
        const result = await response.json();
        const eventoData = result.data || result;
        setEvento(eventoData);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Erro ao carregar evento', 'error');
      }
    } catch (error) {
      showToast('Erro ao carregar evento', 'error');
    }
  };

  const handleSelecionarModelo = async (modelo: ModeloContrato) => {
    setModeloSelecionado(modelo);
    setPasso(2);

    // Buscar todas as variáveis com valores + metadados numa única chamada server-side.
    // O endpoint resolve config + custom + evento (se eventoId) sem depender de repositoryFactory no client.
    const apiUrl = eventoId
      ? `/api/variaveis-contrato/disponiveis?eventoId=${eventoId}`
      : '/api/variaveis-contrato/disponiveis';

    try {
      const response = await fetch(apiUrl);
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;

        setMetadadosVariaveis(data.metadados || null);

        const variaveis: Record<string, any> = data.variaveis || {};

        // Garantir data_contrato preenchida
        if (!variaveis.data_contrato) {
          const hoje = new Date();
          const ano = hoje.getFullYear();
          const mes = String(hoje.getMonth() + 1).padStart(2, '0');
          const dia = String(hoje.getDate()).padStart(2, '0');
          variaveis.data_contrato = `${ano}-${mes}-${dia}`;
        }

        setDadosPreenchidos(variaveis);

        // Verificar se configuração da empresa existe
        const temConfig = !!(variaveis.razao_social || variaveis.cnpj);
        setConfigExistente(temConfig);
        if (!temConfig && !eventoId) {
          showToast('Configure os dados da empresa antes de criar contratos', 'warning');
        }
      } else {
        setConfigExistente(false);
        showToast('Erro ao carregar variáveis do contrato', 'error');
      }
    } catch {
      setConfigExistente(false);
    }
  };

  const gerarPreview = async () => {
    if (!modeloSelecionado) return;
    try {
      const response = await fetch('/api/contratos/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          modeloContratoId: modeloSelecionado.id, 
          dadosPreenchidos,
          eventoId: eventoId || undefined // Incluir eventoId se disponível
        })
      });
      if (response.ok) {
        const result = await response.json();
        // createApiResponse retorna { data: { html: ... } }
        const previewData = result.data || result;
        setPreviewHtml(previewData.html || '');
      }
    } catch (error) {
      // Erro ao gerar preview
    }
  };

  const handleInicializarModelos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/seed/modelos-contrato', { method: 'POST' });
      if (response.ok) {
        showToast('Modelos inicializados com sucesso!', 'success');
        await loadModelos();
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao inicializar modelos', 'error');
      }
    } catch (error) {
      showToast('Erro ao inicializar modelos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const irParaEdicao = () => {
    setConteudoEditado(previewHtml);
    setPasso(3);
  };

  const handleSalvar = async () => {
    if (!modeloSelecionado) return;

    const validacao = ContratoService.validarDadosPreenchidos(dadosPreenchidos, modeloSelecionado.campos);
    if (!validacao.valido) {
      showToast(`Erro: ${validacao.erros.join(', ')}`, 'error');
      return;
    }

    const htmlParaSalvar = passo === 3 ? conteudoEditado : previewHtml;
    if (passo === 3 && (!htmlParaSalvar || !htmlParaSalvar.trim())) {
      showToast('O conteúdo do contrato não pode estar vazio.', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventoId: eventoId || undefined,
          modeloContratoId: modeloSelecionado.id,
          dadosPreenchidos,
          conteudoHtml: htmlParaSalvar?.trim() || undefined,
          status: 'rascunho'
        })
      });

      if (response.ok) {
        const result = await response.json();
        // createApiResponse retorna { data: contrato }
        const contrato = result.data || result;
        showToast('Contrato criado com sucesso', 'success');
        router.push(`/contratos/${contrato.id}`);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao criar contrato', 'error');
      }
    } catch (error) {
      showToast('Erro ao criar contrato', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getValorExibicao = (campo: CampoDinamico): string => {
    const raw = dadosPreenchidos[campo.chave];
    if (raw === undefined || raw === null) return '';
    if (Array.isArray(raw)) return raw.join(', ');
    return String(raw);
  };

  const handleCampoChange = (campo: CampoDinamico, valor: string) => {
    if (campo.tipoVariavel === 'multipla') {
      const arrayVal = valor.split(',').map(v => v.trim()).filter(Boolean);
      setDadosPreenchidos(prev => ({ ...prev, [campo.chave]: arrayVal }));
    } else {
      setDadosPreenchidos(prev => ({ ...prev, [campo.chave]: valor }));
    }
  };

  const renderCampoDinamico = (campo: CampoDinamico) => {
    const valor = getValorExibicao(campo);
    const temValor = valor !== '';
    const borderClass = !temValor && !campo.obrigatorio
      ? 'border-amber-300 dark:border-amber-600'
      : '';

    if (campo.tipoVariavel === 'multipla') {
      return (
        <div key={campo.chave} className="mb-3">
          <label className="block text-sm font-medium text-text-primary mb-1">
            {campo.label}{campo.obrigatorio && ' *'}
            <span className="ml-2 text-xs text-purple-600 dark:text-purple-400 font-normal">(lista)</span>
          </label>
          <Textarea
            value={valor}
            onChange={(e) => handleCampoChange(campo, e.target.value)}
            placeholder="Separe os itens por vírgula"
            className={borderClass}
            required={campo.obrigatorio}
          />
        </div>
      );
    }

    if (campo.tipo === 'textarea') {
      return (
        <div key={campo.chave} className="mb-3">
          <label className="block text-sm font-medium text-text-primary mb-1">
            {campo.label}{campo.obrigatorio && ' *'}
          </label>
          <Textarea
            value={valor}
            onChange={(e) => handleCampoChange(campo, e.target.value)}
            className={borderClass}
            required={campo.obrigatorio}
          />
        </div>
      );
    }

    if (campo.tipo === 'select' && campo.opcoes) {
      return (
        <div key={campo.chave} className="mb-3">
          <label className="block text-sm font-medium text-text-primary mb-1">
            {campo.label}{campo.obrigatorio && ' *'}
          </label>
          <select
            value={valor}
            onChange={(e) => handleCampoChange(campo, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md bg-input text-text-primary ${borderClass}`}
            required={campo.obrigatorio}
          >
            <option value="">Selecione...</option>
            {campo.opcoes.map(op => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>
      );
    }

    const inputType = campo.tipo === 'date'
      ? 'date'
      : campo.tipo === 'number'
        ? 'number'
        : 'text';

    return (
      <div key={campo.chave} className="mb-3">
        <Input
          label={`${campo.label}${campo.obrigatorio ? ' *' : ''}`}
          type={inputType}
          value={valor}
          onChange={(e) => handleCampoChange(campo, e.target.value)}
          className={borderClass}
          required={campo.obrigatorio}
        />
      </div>
    );
  };

  const renderCategoria = (categoria: CampoDinamico['categoria']) => {
    const campos = camposDinamicos.filter(c => c.categoria === categoria);
    if (campos.length === 0) return null;

    const preenchidos = campos.filter(c => {
      const val = dadosPreenchidos[c.chave];
      return val !== undefined && val !== null && val !== '' && !(Array.isArray(val) && val.length === 0);
    }).length;

    return (
      <div key={categoria} className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">
            {CATEGORIA_LABELS[categoria]}
          </h3>
          <span className="text-xs text-text-secondary">
            {preenchidos}/{campos.length} preenchidos
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
          {campos.map(renderCampoDinamico)}
        </div>
      </div>
    );
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => router.back()} className="mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <h1 className="text-3xl font-bold text-text-primary mb-6">Novo Contrato</h1>

        {passo === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Selecione o Modelo de Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingModelos ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <LoadingHotmart size="md" />
                  <p className="mt-4 text-text-secondary">Carregando modelos...</p>
                </div>
              ) : modelos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-text-secondary mb-4">Nenhum modelo disponível</p>
                  <Button onClick={handleInicializarModelos} variant="outline" disabled={loading}>
                    {loading ? 'Inicializando...' : 'Inicializar Modelos'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {modelos.map((modelo) => (
                    <div
                      key={modelo.id}
                      className="border border-border rounded-lg p-4 cursor-pointer bg-surface hover:bg-surface-hover hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                      onClick={() => handleSelecionarModelo(modelo)}
                    >
                      <h3 className="font-semibold text-text-primary">{modelo.nome}</h3>
                      {modelo.descricao && <p className="text-sm text-text-secondary">{modelo.descricao}</p>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {passo === 2 && modeloSelecionado && (
          <>
            {configExistente === false && !evento && (
              <Card className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                <CardHeader>
                  <CardTitle className="text-yellow-800 dark:text-yellow-200">
                    Configuração Necessária
                  </CardTitle>
                  <CardDescription className="text-yellow-700 dark:text-yellow-300">
                    Você precisa configurar os dados fixos da empresa antes de criar contratos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/contratos/configuracao')}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-500"
                  >
                    Configurar Dados da Empresa
                  </Button>
                </CardContent>
              </Card>
            )}
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Preencher Dados do Contrato</CardTitle>
                <CardDescription>
                  Modelo: {modeloSelecionado.nome}
                  {camposDinamicos.length > 0 && (
                    <span className="ml-2 text-xs">
                      — {camposDinamicos.length} {camposDinamicos.length === 1 ? 'variável encontrada' : 'variáveis encontradas'} no template
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {camposDinamicos.length > 0 ? (
                  <div>
                    {CATEGORIA_ORDEM.map(cat => renderCategoria(cat))}
                  </div>
                ) : (
                  <p className="text-text-secondary text-sm py-4">
                    Nenhuma variável encontrada no template. Verifique se o template utiliza o formato {'{{variável}}'} ou {'[variável]'}.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Preview do Contrato</CardTitle>
                <CardDescription>
                  Revise o contrato gerado. Em seguida, edite-o se precisar antes de salvar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContractPreview html={previewHtml} className="min-h-[200px]" />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={() => setPasso(1)} variant="outline">
                Voltar
              </Button>
              <Button
                onClick={irParaEdicao}
                disabled={loading || !previewHtml.trim()}
                className="bg-primary"
              >
                <PencilSquareIcon className="h-4 w-4 mr-2" />
                Editar contrato e continuar
              </Button>
            </div>
          </>
        )}

        {passo === 3 && modeloSelecionado && (
          <>
            <Card className="mb-4">
              <CardHeader>
                <CardTitle>Editar Contrato</CardTitle>
                <CardDescription>
                  Edite o contrato à vontade antes de salvar. Modelo: {modeloSelecionado.nome}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TemplateEditor
                  value={conteudoEditado}
                  onChange={setConteudoEditado}
                  variaveisDisponiveis={[]}
                  placeholder="Conteúdo do contrato..."
                />
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={() => setPasso(2)} variant="outline">
                Voltar
              </Button>
              <Button onClick={handleSalvar} disabled={loading} className="bg-primary">
                {loading ? 'Salvando...' : 'Salvar Contrato'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

export default function NovoContratoPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center py-8">
            <LoadingHotmart size="md" />
            <p className="mt-4 text-text-secondary">Carregando...</p>
          </div>
        </div>
      </Layout>
    }>
      <NovoContratoPageContent />
    </Suspense>
  );
}

