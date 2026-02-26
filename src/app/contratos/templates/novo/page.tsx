'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import ContractPreview from '@/components/ContractPreview';
import TemplateEditor, { TemplateEditorRef } from '@/components/TemplateEditor';
import { gerarCamposDoTemplate } from '@/lib/utils/template-variables';

interface VariavelDisponivel {
  chave: string;
  label: string;
  tipo: 'unica' | 'multipla';
  categoria: 'configuracao' | 'customizada' | 'evento';
}

export default function NovoTemplatePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const editorRef = useRef<TemplateEditorRef>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [variaveisDisponiveis, setVariaveisDisponiveis] = useState<VariavelDisponivel[]>([]);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    template: ''
  });

  useEffect(() => {
    loadVariaveisDisponiveis();
  }, []);

  const loadVariaveisDisponiveis = async () => {
    try {
      const response = await fetch('/api/variaveis-contrato/disponiveis');
      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        const metadados = data.metadados || {};
        
        const variaveis: VariavelDisponivel[] = [];
        
        // Variáveis de configuração
        (metadados.configuracoes || []).forEach((chave: string) => {
          variaveis.push({ chave, label: chave.replace(/_/g, ' '), tipo: 'unica', categoria: 'configuracao' });
        });
        
        // Variáveis customizadas (com tipo vindo do banco de dados)
        (metadados.customizadas || []).forEach((item: { chave: string; tipo: 'unica' | 'multipla' } | string) => {
          const chave = typeof item === 'string' ? item : item.chave;
          const tipo = typeof item === 'string' ? 'unica' : (item.tipo || 'unica');
          variaveis.push({ chave, label: chave.replace(/_/g, ' '), tipo, categoria: 'customizada' });
        });
        
        // Variáveis de evento
        (metadados.evento || []).forEach((chave: string) => {
          // Verificar se é múltipla (tipos_servico)
          const tipo = chave === 'tipos_servico' ? 'multipla' : 'unica';
          variaveis.push({ chave, label: chave.replace(/_/g, ' '), tipo, categoria: 'evento' });
        });
        
        setVariaveisDisponiveis(variaveis);
      }
    } catch (error) {
      // Erro ao carregar variáveis
    }
  };

  const inserirVariavel = (variavel: VariavelDisponivel) => {
    editorRef.current?.inserirVariavel(variavel);
  };

  const handlePreview = async () => {
    if (!formData.template.trim()) {
      showToast('Template não pode estar vazio', 'error');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/contratos/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: formData.template
        })
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;
        setPreviewHtml(data.html || '');
        setMostrarPreview(true);
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao gerar preview', 'error');
      }
    } catch (error) {
      showToast('Erro ao gerar preview', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSalvar = async () => {
    if (!formData.nome || !formData.template) {
      showToast('Nome e Template são obrigatórios', 'error');
      return;
    }

    try {
      setSalvando(true);
      const camposGerados = gerarCamposDoTemplate(formData.template);
      const response = await fetch('/api/modelos-contrato', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: formData.nome,
          descricao: formData.descricao,
          template: formData.template,
          campos: camposGerados,
          ativo: true
        })
      });

      if (response.ok) {
        showToast('Template criado com sucesso', 'success');
        router.push('/contratos/templates');
      } else {
        const error = await response.json();
        showToast(error.error || 'Erro ao salvar template', 'error');
      }
    } catch (error) {
      showToast('Erro ao salvar template', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const variaveisPorCategoria = {
    configuracao: variaveisDisponiveis.filter(v => v.categoria === 'configuracao'),
    customizada: variaveisDisponiveis.filter(v => v.categoria === 'customizada'),
    evento: variaveisDisponiveis.filter(v => v.categoria === 'evento')
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/contratos/templates')}
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Novo Template</h1>
            <p className="text-text-secondary mt-2">
              Crie um template personalizado para seus contratos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de Variáveis */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campos Disponíveis</CardTitle>
                <CardDescription>
                  Clique para inserir no modelo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
                {variaveisPorCategoria.configuracao.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary mb-2">Dados da Empresa</h4>
                    <div className="space-y-1">
                      {variaveisPorCategoria.configuracao.map((v) => (
                        <button
                          key={v.chave}
                          onClick={() => inserirVariavel(v)}
                          className={`w-full flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.02] ${
                            v.tipo === 'unica'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 hover:border-blue-400'
                              : 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 hover:border-purple-400'
                          }`}
                          title={`Clique para inserir ${v.label || v.chave.replace(/_/g, ' ')}`}
                        >
                          <span className="mr-1">{v.tipo === 'unica' ? '📝' : '📋'}</span>
                          {v.label || v.chave.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {variaveisPorCategoria.customizada.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary mb-2">Seus Campos</h4>
                    <div className="space-y-1">
                      {variaveisPorCategoria.customizada.map((v) => (
                        <button
                          key={v.chave}
                          onClick={() => inserirVariavel(v)}
                          className={`w-full flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.02] ${
                            v.tipo === 'unica'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 hover:border-blue-400'
                              : 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 hover:border-purple-400'
                          }`}
                          title={`Clique para inserir ${v.label || v.chave.replace(/_/g, ' ')}`}
                        >
                          <span className="mr-1">{v.tipo === 'unica' ? '📝' : '📋'}</span>
                          {v.label || v.chave.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {variaveisPorCategoria.evento.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-text-primary mb-2">Dados do Evento</h4>
                    <div className="space-y-1">
                      {variaveisPorCategoria.evento.map((v) => (
                        <button
                          key={v.chave}
                          onClick={() => inserirVariavel(v)}
                          className={`w-full flex items-center px-3 py-1.5 rounded-md text-xs font-medium transition-all hover:scale-[1.02] ${
                            v.tipo === 'unica'
                              ? 'bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 hover:border-blue-400'
                              : 'bg-purple-100 text-purple-700 border border-purple-300 hover:bg-purple-200 hover:border-purple-400'
                          }`}
                          title={`Clique para inserir ${v.label || v.chave.replace(/_/g, ' ')}`}
                        >
                          <span className="mr-1">{v.tipo === 'unica' ? '📝' : '📋'}</span>
                          {v.label || v.chave.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {variaveisDisponiveis.length === 0 && (
                  <p className="text-sm text-text-secondary">Nenhum campo disponível</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Editor */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle>Editor de Template</CardTitle>
                <CardDescription>
                  Use o editor para criar seu modelo. Valor único: {'{{campo}}'}, Lista de valores: {'[campo]'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Nome do Template *
                  </label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Contrato Personalizado"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Descrição
                  </label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição do template"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">
                    Template *
                  </label>
                  <TemplateEditor
                    ref={editorRef}
                    value={formData.template}
                    onChange={(html) => setFormData({ ...formData, template: html })}
                    variaveisDisponiveis={variaveisDisponiveis}
                    placeholder="Digite seu modelo aqui... Use a barra de ferramentas para formatar e clique nos campos na barra lateral para inserir."
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSalvar} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Salvar Template'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handlePreview}
                    disabled={loading}
                  >
                    {loading ? 'Gerando...' : 'Preview'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => router.push('/contratos/templates')}
                  >
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {mostrarPreview && previewHtml && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Preview</CardTitle>
                  <CardDescription>
                    Visualização do contrato formatado
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContractPreview html={previewHtml} className="max-h-[800px]" />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
