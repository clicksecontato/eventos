'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Contrato } from '@/types';
import { ArrowLeftIcon, DocumentTextIcon, ArrowDownTrayIcon, PencilIcon, EyeIcon } from '@heroicons/react/24/outline';
import ContractPreview from '@/components/ContractPreview';
import TemplateEditor, { TemplateEditorRef } from '@/components/TemplateEditor';

type AbaAtiva = 'visualizar' | 'editar';

export default function ContratoViewPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [loading, setLoading] = useState(true);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('visualizar');
  const [conteudoHtml, setConteudoHtml] = useState<string>('');
  const [conteudoEditado, setConteudoEditado] = useState<string>('');
  const [htmlPreview, setHtmlPreview] = useState<string>('');
  const [carregandoHtml, setCarregandoHtml] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [temAlteracoes, setTemAlteracoes] = useState(false);
  const editorRef = useRef<TemplateEditorRef>(null);

  const carregarHtmlParaPreview = useCallback(async () => {
    if (!contrato || !contrato.modeloContratoId) return;

    try {
      const response = await fetch('/api/contratos/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modeloContratoId: contrato.modeloContratoId,
          dadosPreenchidos: contrato.dadosPreenchidos,
          eventoId: contrato.eventoId || undefined
        })
      });

      if (response.ok) {
        const result = await response.json();
        const previewData = result.data || result;
        const html = previewData.html || '';
        setHtmlPreview(html);
      }
    } catch (error) {
      // Erro silencioso
    }
  }, [contrato]);

  const carregarHtmlContrato = useCallback(async () => {
    if (!contrato) return;

    try {
      setCarregandoHtml(true);
      
      // Se já tem conteudoHtml, usar ele
      if (contrato.conteudoHtml && contrato.conteudoHtml.trim()) {
        const html = contrato.conteudoHtml;
        setConteudoHtml(html);
        setConteudoEditado(html);
        setHtmlPreview(html);
        return;
      }

      // Caso contrário, gerar HTML processando o template
      if (contrato.modeloContratoId) {
        const response = await fetch('/api/contratos/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modeloContratoId: contrato.modeloContratoId,
            dadosPreenchidos: contrato.dadosPreenchidos,
            eventoId: contrato.eventoId || undefined
          })
        });

        if (response.ok) {
          const result = await response.json();
          const previewData = result.data || result;
          const html = previewData.html || '';
          setConteudoHtml(html);
          setConteudoEditado(html);
          setHtmlPreview(html);
        } else {
          showToast('Erro ao carregar conteúdo do contrato', 'error');
        }
      }
    } catch (error) {
      showToast('Erro ao carregar conteúdo do contrato', 'error');
    } finally {
      setCarregandoHtml(false);
    }
  }, [contrato, showToast]);

  const loadContrato = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/contratos/${params.id}`);
      if (response.ok) {
        const result = await response.json();
        // createApiResponse retorna { data: contrato }
        const contratoData = result.data || result;
        setContrato(contratoData);
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Erro ao carregar contrato', 'error');
      }
    } catch (error) {
      showToast('Erro ao carregar contrato', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.id, showToast]);

  useEffect(() => {
    loadContrato();
  }, [loadContrato]);

  // Carregar HTML quando o contrato for carregado
  useEffect(() => {
    if (contrato) {
      // Se tem conteudoHtml, usar diretamente
      if (contrato.conteudoHtml && contrato.conteudoHtml.trim()) {
        const html = contrato.conteudoHtml;
        setConteudoHtml(html);
        setConteudoEditado(html);
        setHtmlPreview(html);
      } else {
        // Carregar HTML processando template para preview
        carregarHtmlParaPreview();
      }
    }
  }, [contrato, carregarHtmlParaPreview]);

  // Carregar HTML quando mudar para aba editar (se ainda não foi carregado)
  useEffect(() => {
    if (contrato && abaAtiva === 'editar' && !conteudoHtml) {
      carregarHtmlContrato();
    }
  }, [abaAtiva, contrato, conteudoHtml, carregarHtmlContrato]);

  // Detectar alterações no conteúdo editado
  useEffect(() => {
    if (conteudoEditado && conteudoEditado !== conteudoHtml) {
      setTemAlteracoes(true);
    } else {
      setTemAlteracoes(false);
    }
  }, [conteudoEditado, conteudoHtml]);

  const handleSalvarAlteracoes = async () => {
    if (!contrato || !conteudoEditado.trim()) {
      showToast('O conteúdo do contrato não pode estar vazio', 'error');
      return;
    }

    try {
      setSalvando(true);
      const response = await fetch(`/api/contratos/${contrato.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conteudoHtml: conteudoEditado.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        const contratoAtualizado = result.data || result;
        setContrato(contratoAtualizado);
        const htmlSalvo = conteudoEditado.trim();
        setConteudoHtml(htmlSalvo);
        setHtmlPreview(htmlSalvo);
        setTemAlteracoes(false);
        showToast('Contrato atualizado com sucesso', 'success');
        setAbaAtiva('visualizar');
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Erro ao salvar alterações', 'error');
      }
    } catch (error) {
      showToast('Erro ao salvar alterações', 'error');
    } finally {
      setSalvando(false);
    }
  };

  const handleCancelarEdicao = () => {
    if (temAlteracoes) {
      if (confirm('Você tem alterações não salvas. Deseja realmente cancelar?')) {
        setConteudoEditado(conteudoHtml);
        setTemAlteracoes(false);
        setAbaAtiva('visualizar');
      }
    } else {
      setAbaAtiva('visualizar');
    }
  };

  const handleGerarPDF = async () => {
    if (!contrato) return;
    try {
      setGerandoPDF(true);
      const response = await fetch(`/api/contratos/${contrato.id}/gerar-pdf`, { method: 'POST' });
      if (response.ok) {
        const result = await response.json();
        // createApiResponse retorna { data: { pdfUrl, ... } }
        const pdfData = result.data || result;
        showToast('PDF gerado com sucesso', 'success');
        if (pdfData.pdfUrl) {
          window.open(pdfData.pdfUrl, '_blank');
        }
        await loadContrato();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Erro ao gerar PDF', 'error');
      }
    } catch (error) {
      showToast('Erro ao gerar PDF', 'error');
    } finally {
      setGerandoPDF(false);
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Carregando...</div>
        </div>
      </Layout>
    );
  }

  if (!contrato) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Contrato não encontrado</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <Button variant="outline" onClick={() => router.push('/contratos')} className="mb-4">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">{contrato.numeroContrato || 'Contrato'}</h1>
            <p className="text-text-secondary">{contrato.modeloContrato?.nome}</p>
          </div>
          <div className="flex gap-2">
            {contrato.status === 'rascunho' && (
              <Button onClick={handleGerarPDF} disabled={gerandoPDF}>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            )}
            {contrato.pdfUrl && (
              <Button variant="outline" onClick={() => window.open(contrato.pdfUrl, '_blank')}>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
        </div>

        {/* Sistema de Abas */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-border">
            <button
              onClick={() => {
                if (temAlteracoes && abaAtiva === 'editar') {
                  if (confirm('Você tem alterações não salvas. Deseja realmente sair da edição?')) {
                    setAbaAtiva('visualizar');
                  }
                } else {
                  setAbaAtiva('visualizar');
                }
              }}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                abaAtiva === 'visualizar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <EyeIcon className="h-5 w-5" />
                Visualizar
              </div>
            </button>
            <button
              onClick={() => {
                if (!conteudoHtml && contrato) {
                  carregarHtmlContrato();
                }
                setAbaAtiva('editar');
              }}
              className={`px-4 py-2 font-medium transition-colors border-b-2 relative ${
                abaAtiva === 'editar'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <PencilIcon className="h-5 w-5" />
                Editar
                {temAlteracoes && (
                  <span className="ml-1 px-2 py-0.5 text-xs bg-warning text-warning-text rounded-full">
                    Alterações não salvas
                  </span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        {abaAtiva === 'visualizar' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Preview do Contrato</CardTitle>
                <CardDescription>
                  Visualização do contrato como será impresso no PDF
                </CardDescription>
              </CardHeader>
              <CardContent>
                {htmlPreview ? (
                  <ContractPreview 
                    html={htmlPreview} 
                    className="min-h-[600px]"
                  />
                ) : (
                  <div className="flex items-center justify-center py-12 min-h-[600px]">
                    <div className="text-center">
                      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                      <p className="text-text-secondary">Carregando preview do contrato...</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!conteudoHtml && contrato) {
                        carregarHtmlContrato();
                      }
                      setAbaAtiva('editar');
                    }}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    Editar Contrato
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Status:</strong> <span className="capitalize">{contrato.status || 'N/A'}</span></p>
                  <p><strong>Data de Criação:</strong> {
                    contrato.dataCadastro 
                      ? (contrato.dataCadastro instanceof Date 
                          ? contrato.dataCadastro.toLocaleDateString('pt-BR')
                          : new Date(contrato.dataCadastro).toLocaleDateString('pt-BR'))
                      : 'N/A'
                  }</p>
                  {contrato.dataGeracao && (
                    <p><strong>Data de Geração:</strong> {
                      contrato.dataGeracao instanceof Date
                        ? contrato.dataGeracao.toLocaleDateString('pt-BR')
                        : new Date(contrato.dataGeracao).toLocaleDateString('pt-BR')
                    }</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {abaAtiva === 'editar' && (
          <Card>
            <CardHeader>
              <CardTitle>Editar Contrato</CardTitle>
              <CardDescription>
                Edite o conteúdo do contrato livremente. As alterações serão salvas no contrato.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {carregandoHtml ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
                    <p className="text-text-secondary">Carregando conteúdo do contrato...</p>
                  </div>
                </div>
              ) : (
                <>
                  <TemplateEditor
                    ref={editorRef}
                    value={conteudoEditado}
                    onChange={(html) => setConteudoEditado(html)}
                    variaveisDisponiveis={[]}
                    placeholder="Edite o conteúdo do contrato aqui..."
                  />
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={handleCancelarEdicao}
                      disabled={salvando}
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleSalvarAlteracoes}
                      disabled={salvando || !temAlteracoes}
                      className="bg-primary"
                    >
                      {salvando ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

