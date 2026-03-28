'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { Contrato } from '@/types';
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  EyeIcon,
  PencilSquareIcon,
  LinkIcon,
  NoSymbolIcon,
  ClockIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import ContractPreview from '@/components/ContractPreview';
import TemplateEditor, { TemplateEditorRef } from '@/components/TemplateEditor';
import { AssinaturaContratoDialog } from '@/components/contratos/AssinaturaContratoDialog';
import { GerarLinkAssinaturaClienteDialog } from '@/components/contratos/GerarLinkAssinaturaClienteDialog';
import { ContratoPartesPanel } from '@/components/contratos/ContratoPartesPanel';

type AbaAtiva = 'visualizar' | 'editar' | 'partes' | 'historico';

type EventoAuditoriaContratoUi = {
  id: string;
  tipoEvento: string;
  payload: Record<string, unknown>;
  criadoEm: string;
  actorUserId?: string | null;
};

const ROTULOS_EVENTO_CONTRATO: Record<string, string> = {
  contrato_criado: 'Contrato criado',
  conteudo_alterado: 'Conteúdo (HTML) alterado',
  metadados_alterados: 'Metadados alterados',
  status_alterado: 'Status alterado',
  pdf_gerado: 'PDF gerado',
  assinado_interno: 'Assinado (usuário logado)',
  assinado_link_publico: 'Assinado (link público)',
  convite_link_criado: 'Convite de assinatura criado',
  convites_revogados: 'Links de assinatura revogados',
  parte_criada: 'Parte criada',
  parte_atualizada: 'Parte atualizada',
  parte_excluida: 'Parte excluída',
  signatario_criado: 'Signatário adicionado',
  signatario_atualizado: 'Signatário atualizado',
  signatario_excluido: 'Signatário removido',
};

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
  const [dialogAssinaturaAberto, setDialogAssinaturaAberto] = useState(false);
  const [dialogLinkClienteAberto, setDialogLinkClienteAberto] = useState(false);
  const [revogandoLinks, setRevogandoLinks] = useState(false);
  const [eventosAuditoria, setEventosAuditoria] = useState<EventoAuditoriaContratoUi[]>([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
  const [erroAuditoria, setErroAuditoria] = useState<string | null>(null);
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

  const carregarEventosAuditoria = useCallback(async () => {
    if (!contrato?.id) return;
    try {
      setCarregandoAuditoria(true);
      setErroAuditoria(null);
      const res = await fetch(`/api/contratos/${contrato.id}/eventos-auditoria`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErroAuditoria(json.error || 'Erro ao carregar histórico');
        setEventosAuditoria([]);
        return;
      }
      const data = json.data || json;
      setEventosAuditoria(Array.isArray(data.eventos) ? data.eventos : []);
    } catch {
      setErroAuditoria('Erro de rede ao carregar histórico');
      setEventosAuditoria([]);
    } finally {
      setCarregandoAuditoria(false);
    }
  }, [contrato?.id]);

  const irParaAba = (destino: AbaAtiva) => {
    if (temAlteracoes && abaAtiva === 'editar' && destino !== 'editar') {
      if (!confirm('Você tem alterações não salvas. Deseja realmente sair da edição?')) {
        return;
      }
    }
    setAbaAtiva(destino);
  };

  useEffect(() => {
    loadContrato();
  }, [loadContrato]);

  useEffect(() => {
    if (abaAtiva === 'historico' && contrato?.id) {
      carregarEventosAuditoria();
    }
  }, [abaAtiva, contrato?.id, carregarEventosAuditoria]);

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
            {contrato.status === 'gerado' && contrato.pdfPath && (
              <Button variant="default" onClick={() => setDialogAssinaturaAberto(true)}>
                <PencilSquareIcon className="h-5 w-5 mr-2" />
                Assinar PDF
              </Button>
            )}
            {contrato.status === 'gerado' && contrato.pdfPath && (
              <Button variant="outline" onClick={() => setDialogLinkClienteAberto(true)}>
                <LinkIcon className="h-5 w-5 mr-2" />
                Gerar link para cliente
              </Button>
            )}
            {contrato.status === 'gerado' && contrato.pdfPath && (
              <Button
                variant="outline"
                disabled={revogandoLinks}
                onClick={async () => {
                  if (
                    !confirm(
                      'Revogar todos os links de assinatura pendentes deste contrato? Quem tiver o link antigo não poderá mais assinar.'
                    )
                  ) {
                    return;
                  }
                  try {
                    setRevogandoLinks(true);
                    const res = await fetch(`/api/contratos/${contrato.id}/revogar-convite-assinatura`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({}),
                    });
                    const json = await res.json().catch(() => ({}));
                    if (!res.ok) {
                      showToast(json.error || 'Não foi possível revogar os links.', 'error');
                      return;
                    }
                    const rev = json.data?.revogados ?? json.revogados;
                    showToast(
                      rev > 0 ? `${rev} link(ns) revogado(s).` : 'Nenhum link ativo para revogar.',
                      rev > 0 ? 'success' : 'info'
                    );
                  } catch {
                    showToast('Erro de rede ao revogar links.', 'error');
                  } finally {
                    setRevogandoLinks(false);
                  }
                }}
              >
                <NoSymbolIcon className="h-5 w-5 mr-2" />
                {revogandoLinks ? 'Revogando...' : 'Revogar links pendentes'}
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
              type="button"
              onClick={() => irParaAba('visualizar')}
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
              type="button"
              onClick={() => {
                if (!conteudoHtml && contrato) {
                  carregarHtmlContrato();
                }
                irParaAba('editar');
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
            <button
              type="button"
              onClick={() => irParaAba('partes')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                abaAtiva === 'partes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5" />
                Partes
              </div>
            </button>
            <button
              type="button"
              onClick={() => irParaAba('historico')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                abaAtiva === 'historico'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className="flex items-center gap-2">
                <ClockIcon className="h-5 w-5" />
                Histórico
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
                  {contrato.status === 'assinado' && contrato.dataAssinatura && (
                    <p><strong>Data de assinatura:</strong> {
                      contrato.dataAssinatura instanceof Date
                        ? contrato.dataAssinatura.toLocaleString('pt-BR')
                        : new Date(contrato.dataAssinatura).toLocaleString('pt-BR')
                    }</p>
                  )}
                  {contrato.assinaturaAuditoria?.hashPdfDepoisAssinatura && (
                    <p className="text-xs text-text-secondary break-all">
                      <strong>SHA-256 (PDF assinado):</strong>{' '}
                      {contrato.assinaturaAuditoria.hashPdfDepoisAssinatura}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {abaAtiva === 'partes' && contrato && (
          <ContratoPartesPanel contratoId={contrato.id} somenteLeitura={contrato.status === 'assinado'} />
        )}

        {abaAtiva === 'historico' && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico e auditoria</CardTitle>
              <CardDescription>
                Registro cronológico de ações neste contrato (eventos imutáveis). Aplicável a partir da migração do
                banco; contratos antigos podem ter histórico vazio.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => carregarEventosAuditoria()}>
                  Atualizar
                </Button>
              </div>
              {carregandoAuditoria && (
                <div className="flex justify-center py-10">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent" />
                </div>
              )}
              {!carregandoAuditoria && erroAuditoria && (
                <p className="text-sm text-red-600">{erroAuditoria}</p>
              )}
              {!carregandoAuditoria && !erroAuditoria && eventosAuditoria.length === 0 && (
                <p className="text-sm text-text-secondary">Nenhum evento registrado ainda.</p>
              )}
              {!carregandoAuditoria && !erroAuditoria && eventosAuditoria.length > 0 && (
                <ul className="space-y-4">
                  {eventosAuditoria.map((ev) => {
                    const dataFmt = ev.criadoEm
                      ? new Date(ev.criadoEm).toLocaleString('pt-BR')
                      : '—';
                    const titulo = ROTULOS_EVENTO_CONTRATO[ev.tipoEvento] || ev.tipoEvento;
                    return (
                      <li
                        key={ev.id}
                        className="rounded-lg border border-border bg-card p-4 text-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-medium text-text-primary">{titulo}</span>
                          <time className="text-xs text-text-secondary">{dataFmt}</time>
                        </div>
                        {ev.actorUserId && (
                          <p className="mt-1 text-xs text-text-secondary">Ator (user id): {ev.actorUserId}</p>
                        )}
                        {Object.keys(ev.payload || {}).length > 0 && (
                          <pre className="mt-2 max-h-40 overflow-auto rounded bg-muted/50 p-2 text-xs text-text-secondary">
                            {JSON.stringify(ev.payload, null, 2)}
                          </pre>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
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

        <AssinaturaContratoDialog
          open={dialogAssinaturaAberto}
          onOpenChange={setDialogAssinaturaAberto}
          contratoId={contrato.id}
          onAssinaturaConcluida={async () => {
            showToast('Contrato assinado. PDF atualizado.', 'success');
            await loadContrato();
          }}
          onErro={(msg) => showToast(msg, 'error')}
        />
        <GerarLinkAssinaturaClienteDialog
          open={dialogLinkClienteAberto}
          onOpenChange={setDialogLinkClienteAberto}
          contratoId={contrato.id}
          onSucesso={async (link, emailEnviado, erroEmail, resendMock) => {
            if (link && navigator?.clipboard?.writeText) {
              await navigator.clipboard.writeText(link);
              showToast('Link de assinatura gerado e copiado para a área de transferência', 'success');
            } else if (link) {
              showToast('Link gerado com sucesso', 'success');
              window.open(link, '_blank');
            }
            if (resendMock) {
              showToast('RESEND_MOCK ativo: nenhum e-mail enviado. Use o link copiado ou o log do servidor.', 'info');
            } else if (!emailEnviado && erroEmail) {
              showToast(`Link gerado, mas o e-mail não foi enviado: ${erroEmail}`, 'error');
            } else if (emailEnviado) {
              showToast('E-mail de assinatura enviado ao cliente', 'success');
            }
          }}
          onErro={(msg) => showToast(msg, 'error')}
        />
      </div>
    </Layout>
  );
}

