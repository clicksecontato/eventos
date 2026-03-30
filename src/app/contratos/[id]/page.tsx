'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
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
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import ContractPreview from '@/components/ContractPreview';
import TemplateEditor, { TemplateEditorRef } from '@/components/TemplateEditor';
import { AssinaturaContratoDialog } from '@/components/contratos/AssinaturaContratoDialog';
import { GerarLinkAssinaturaClienteDialog } from '@/components/contratos/GerarLinkAssinaturaClienteDialog';
import { ContratoPartesPanel } from '@/components/contratos/ContratoPartesPanel';
import { ContratoJornadaAssinaturaBanner } from '@/components/contratos/ContratoJornadaAssinaturaBanner';
import { LinkGeradoSucessoDialog } from '@/components/contratos/LinkGeradoSucessoDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tentarCopiarParaAreaTransferencia } from '@/lib/utils/contrato-link-signatario-client';

type AbaAtiva = 'visualizar' | 'editar' | 'partes' | 'historico';

type DialogEdicaoPendente =
  | null
  | { modo: 'mudar_aba'; destino: AbaAtiva }
  | { modo: 'cancelar' };

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

type FiltroHistoricoContrato = 'todos' | 'assinatura' | 'convites' | 'partes';

const TIPOS_HISTORICO_ASSINATURA = new Set(['assinado_interno', 'assinado_link_publico']);
const TIPOS_HISTORICO_CONVITES = new Set(['convite_link_criado', 'convites_revogados']);
const TIPOS_HISTORICO_PARTES = new Set([
  'parte_criada',
  'parte_atualizada',
  'parte_excluida',
  'signatario_criado',
  'signatario_atualizado',
  'signatario_excluido',
]);

const ABAS_CONTRATO_URL: AbaAtiva[] = ['visualizar', 'editar', 'partes', 'historico'];

export default function ContratoViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [eventosAuditoria, setEventosAuditoria] = useState<EventoAuditoriaContratoUi[]>([]);
  const [carregandoAuditoria, setCarregandoAuditoria] = useState(false);
  const [erroAuditoria, setErroAuditoria] = useState<string | null>(null);
  const [dialogEdicaoPendente, setDialogEdicaoPendente] = useState<DialogEdicaoPendente>(null);
  const [dialogRevogarLinksAberto, setDialogRevogarLinksAberto] = useState(false);
  const [signatarioIdPreGerarLink, setSignatarioIdPreGerarLink] = useState<string | null>(null);
  const [avisoRenovarGerarLink, setAvisoRenovarGerarLink] = useState(false);
  const [linkGeradoSucessoUrl, setLinkGeradoSucessoUrl] = useState<string | null>(null);
  const [filtroHistorico, setFiltroHistorico] = useState<FiltroHistoricoContrato>('todos');
  const editorRef = useRef<TemplateEditorRef>(null);
  const abaUrlInicialAplicada = useRef(false);

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
      setDialogEdicaoPendente({ modo: 'mudar_aba', destino });
      return;
    }
    setAbaAtiva(destino);
  };

  useEffect(() => {
    loadContrato();
  }, [loadContrato]);

  useEffect(() => {
    if (!contrato || abaUrlInicialAplicada.current) return;
    const raw = searchParams.get('aba');
    if (raw && ABAS_CONTRATO_URL.includes(raw as AbaAtiva)) {
      setAbaAtiva(raw as AbaAtiva);
      abaUrlInicialAplicada.current = true;
    }
  }, [contrato, searchParams]);

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
      setDialogEdicaoPendente({ modo: 'cancelar' });
      return;
    }
    setAbaAtiva('visualizar');
  };

  const executarRevogacaoLinks = async () => {
    if (!contrato) return;
    try {
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
      if (rev > 0) await loadContrato();
    } catch {
      showToast('Erro de rede ao revogar links.', 'error');
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

  const eventosHistoricoFiltrados = useMemo(() => {
    if (filtroHistorico === 'todos') return eventosAuditoria;
    if (filtroHistorico === 'assinatura') {
      return eventosAuditoria.filter((e) => TIPOS_HISTORICO_ASSINATURA.has(e.tipoEvento));
    }
    if (filtroHistorico === 'convites') {
      return eventosAuditoria.filter((e) => TIPOS_HISTORICO_CONVITES.has(e.tipoEvento));
    }
    return eventosAuditoria.filter((e) => TIPOS_HISTORICO_PARTES.has(e.tipoEvento));
  }, [eventosAuditoria, filtroHistorico]);

  const resumoHistoricoRecente = useMemo(
    () => eventosHistoricoFiltrados.slice(0, 5),
    [eventosHistoricoFiltrados]
  );
  const documentoFechado = contrato?.status === 'document_closed';

  useEffect(() => {
    if (documentoFechado && abaAtiva === 'editar') {
      setAbaAtiva('visualizar');
    }
  }, [documentoFechado, abaAtiva]);

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
          <div className="flex flex-wrap gap-2">
            {contrato.status === 'rascunho' && (
              <Button onClick={handleGerarPDF} disabled={gerandoPDF}>
                <DocumentTextIcon className="h-5 w-5 mr-2" />
                {gerandoPDF ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            )}
            {contrato.status === 'gerado' && contrato.pdfPath && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    Assinatura
                    <ChevronDownIcon className="h-4 w-4 opacity-70" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[14rem]">
                  <DropdownMenuItem
                    onClick={() => setDialogAssinaturaAberto(true)}
                    className="cursor-pointer gap-2"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                    Assinar PDF (interno)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSignatarioIdPreGerarLink(null);
                      setAvisoRenovarGerarLink(false);
                      setDialogLinkClienteAberto(true);
                    }}
                    className="cursor-pointer gap-2"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Gerar link para cliente
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDialogRevogarLinksAberto(true)}
                    className="cursor-pointer gap-2"
                  >
                    <NoSymbolIcon className="h-4 w-4" />
                    Revogar links pendentes
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {contrato.pdfUrl && (
              <Button variant="default" onClick={() => window.open(contrato.pdfUrl, '_blank')}>
                <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                Baixar PDF
              </Button>
            )}
          </div>
        </div>

        <ContratoJornadaAssinaturaBanner
          contrato={contrato}
          onIrParaPartes={() => irParaAba('partes')}
          onGerarPdf={handleGerarPDF}
          onAbrirGerarLink={() => {
            setSignatarioIdPreGerarLink(null);
            setAvisoRenovarGerarLink(false);
            setDialogLinkClienteAberto(true);
          }}
          gerandoPdf={gerandoPDF}
        />

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
                if (documentoFechado) {
                  showToast('Documento fechado: não é mais possível editar este contrato.', 'info');
                  return;
                }
                if (!conteudoHtml && contrato) {
                  carregarHtmlContrato();
                }
                irParaAba('editar');
              }}
              disabled={documentoFechado}
              className={`px-4 py-2 font-medium transition-colors border-b-2 relative ${
                abaAtiva === 'editar'
                  ? 'border-primary text-primary'
                  : `border-transparent text-text-secondary hover:text-text-primary ${
                      documentoFechado ? 'cursor-not-allowed opacity-60 hover:text-text-secondary' : ''
                    }`
              }`}
            >
              <div className="flex items-center gap-2">
                <PencilIcon className="h-5 w-5" />
                {documentoFechado ? 'Editar (bloqueado)' : 'Editar'}
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
                      if (documentoFechado) {
                        showToast('Documento fechado: não é mais possível editar este contrato.', 'info');
                        return;
                      }
                      if (!conteudoHtml && contrato) {
                        carregarHtmlContrato();
                      }
                      setAbaAtiva('editar');
                    }}
                    disabled={documentoFechado}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" />
                    {documentoFechado ? 'Edição bloqueada' : 'Editar Contrato'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {contrato.status === 'rascunho' && !contrato.pdfPath?.trim() && (
              <Card className="border-amber-500/35 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="text-base">Próximo passo: gerar o PDF</CardTitle>
                  <CardDescription>
                    Com o contrato em rascunho e sem PDF gerado, o link de assinatura ainda não fica disponível. Gere o
                    PDF quando o texto estiver pronto; em seguida você pode usar a aba Partes para signatários.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleGerarPDF} disabled={gerandoPDF}>
                    <DocumentTextIcon className="mr-2 h-4 w-4" />
                    {gerandoPDF ? 'Gerando…' : 'Gerar PDF agora'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => irParaAba('partes')}>
                    <UserGroupIcon className="mr-2 h-4 w-4" />
                    Ir para Partes
                  </Button>
                </CardContent>
              </Card>
            )}

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
                  {(contrato.status === 'assinado' || contrato.status === 'document_closed') && contrato.dataAssinatura && (
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
          <ContratoPartesPanel
            contratoId={contrato.id}
            somenteLeitura={contrato.status === 'assinado' || contrato.status === 'document_closed'}
            contratoStatus={contrato.status}
            contratoPdfPath={contrato.pdfPath}
            bloquearBotoesLink={dialogLinkClienteAberto}
            onPedidoAbrirGerarLink={({ signatarioId, modo }) => {
              setSignatarioIdPreGerarLink(signatarioId ?? null);
              setAvisoRenovarGerarLink(modo === 'copiar');
              setDialogLinkClienteAberto(true);
            }}
          />
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
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { id: 'todos' as const, label: 'Todos' },
                      { id: 'assinatura' as const, label: 'Assinatura' },
                      { id: 'convites' as const, label: 'Convites' },
                      { id: 'partes' as const, label: 'Partes' },
                    ] as const
                  ).map((chip) => (
                    <Button
                      key={chip.id}
                      type="button"
                      size="sm"
                      variant={filtroHistorico === chip.id ? 'default' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => setFiltroHistorico(chip.id)}
                    >
                      {chip.label}
                    </Button>
                  ))}
                </div>
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
              {!carregandoAuditoria && !erroAuditoria && eventosAuditoria.length > 0 && resumoHistoricoRecente.length > 0 && (
                <div className="mb-6 rounded-lg border border-border bg-muted/30 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    Resumo recente ({filtroHistorico === 'todos' ? 'geral' : filtroHistorico})
                  </p>
                  <ul className="space-y-1.5 text-sm text-text-primary">
                    {resumoHistoricoRecente.map((ev) => {
                      const dataFmt = ev.criadoEm
                        ? new Date(ev.criadoEm).toLocaleString('pt-BR')
                        : '—';
                      const titulo = ROTULOS_EVENTO_CONTRATO[ev.tipoEvento] || ev.tipoEvento;
                      return (
                        <li key={`resumo-${ev.id}`} className="flex flex-wrap justify-between gap-2 border-b border-border/50 pb-1.5 last:border-0">
                          <span>{titulo}</span>
                          <time className="text-xs text-text-secondary">{dataFmt}</time>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              {!carregandoAuditoria &&
                !erroAuditoria &&
                eventosAuditoria.length > 0 &&
                eventosHistoricoFiltrados.length === 0 && (
                  <p className="mb-4 text-sm text-text-secondary">
                    Nenhum evento nesta categoria. Escolha outro filtro ou &quot;Todos&quot;.
                  </p>
                )}
              {!carregandoAuditoria && !erroAuditoria && eventosHistoricoFiltrados.length > 0 && (
                <ul className="space-y-4">
                  {eventosHistoricoFiltrados.map((ev) => {
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
        <ConfirmationDialog
          open={dialogEdicaoPendente !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setDialogEdicaoPendente(null);
          }}
          title={
            dialogEdicaoPendente?.modo === 'cancelar'
              ? 'Descartar alterações?'
              : 'Alterações não salvas'
          }
          description={
            dialogEdicaoPendente?.modo === 'cancelar'
              ? 'O texto voltará ao último conteúdo salvo no servidor.'
              : 'Você editou o contrato e ainda não salvou. Ao mudar de aba, o rascunho permanece até você voltar em Editar e salvar ou descartar.'
          }
          confirmText={dialogEdicaoPendente?.modo === 'cancelar' ? 'Descartar' : 'Mudar de aba'}
          cancelText="Voltar"
          onConfirm={() => {
            if (!dialogEdicaoPendente) return;
            if (dialogEdicaoPendente.modo === 'cancelar') {
              setConteudoEditado(conteudoHtml);
              setTemAlteracoes(false);
              setAbaAtiva('visualizar');
            } else {
              setAbaAtiva(dialogEdicaoPendente.destino);
            }
          }}
        />

        <ConfirmationDialog
          open={dialogRevogarLinksAberto}
          onOpenChange={setDialogRevogarLinksAberto}
          title="Revogar links de assinatura?"
          description="Todos os links de assinatura pendentes deste contrato serão cancelados. Quem tiver um link antigo não poderá mais assinar por ele."
          variant="destructive"
          confirmText="Revogar links"
          cancelText="Cancelar"
          onConfirm={() => {
            void executarRevogacaoLinks();
          }}
        />

        <GerarLinkAssinaturaClienteDialog
          open={dialogLinkClienteAberto}
          onOpenChange={(aberto) => {
            setDialogLinkClienteAberto(aberto);
            if (!aberto) {
              setSignatarioIdPreGerarLink(null);
              setAvisoRenovarGerarLink(false);
            }
          }}
          contratoId={contrato.id}
          signatarioIdInicial={signatarioIdPreGerarLink}
          avisoRenovarConviteAnterior={avisoRenovarGerarLink}
          onSucesso={async (link, emailEnviado, erroEmail, resendMock) => {
            if (link) {
              const copiou = await tentarCopiarParaAreaTransferencia(link);
              if (copiou) {
                showToast('Link gerado e copiado para a área de transferência.', 'success');
              } else {
                showToast('Link gerado. Use o diálogo para copiar ou abrir em nova aba.', 'info');
              }
              setLinkGeradoSucessoUrl(link);
            }
            if (resendMock) {
              showToast('RESEND_MOCK ativo: nenhum e-mail enviado. Use o link copiado ou o log do servidor.', 'info');
            } else if (!emailEnviado && erroEmail) {
              showToast(`Link gerado, mas o e-mail não foi enviado: ${erroEmail}`, 'error');
            } else if (emailEnviado) {
              showToast('E-mail de assinatura enviado ao signatário.', 'success');
            }
            await loadContrato();
          }}
          onErro={(msg) => showToast(msg, 'error')}
        />
        <LinkGeradoSucessoDialog
          open={linkGeradoSucessoUrl !== null}
          onOpenChange={(aberto) => {
            if (!aberto) setLinkGeradoSucessoUrl(null);
          }}
          link={linkGeradoSucessoUrl ?? ''}
        />
      </div>
    </Layout>
  );
}

