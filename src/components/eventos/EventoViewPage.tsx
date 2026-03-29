'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Layout from '@/components/Layout';
import { ArrowLeftIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { useEvento, usePagamentosPorEvento, useCustosPorEvento, useServicosPorEvento, useContratosPorEvento } from '@/hooks/useData';
import { useAnexos } from '@/hooks/useAnexos';
import { useCurrentUser } from '@/hooks/useAuth';
import { usePlano } from '@/lib/hooks/usePlano';
import { dataService } from '@/lib/data-service';
import { AgendamentoAlocacao, Evento, Contrato } from '@/types';
import PagamentoHistorico from '@/components/PagamentoHistorico';
import CustosEvento from '@/components/CustosEvento';
import ServicosEvento from '@/components/ServicosEvento';
import AnexosEvento from '@/components/AnexosEvento';
import ConfirmationDialog from '@/components/ui/confirmation-dialog';
import { useToast } from '@/components/ui/toast';
import LoadingHotmart from '@/components/LoadingHotmart';
import {
  podeGerarLinkAssinaturaContrato,
  solicitarLinkAssinaturaSignatario,
} from '@/lib/utils/contrato-link-signatario-client';
import { formatarTextoEventoParaCopiar } from './evento-view-copy-text';
import { EventoBasicoSection } from './EventoBasicoSection';
import { EventoContratosSection } from './EventoContratosSection';
import { EventoResumoFinanceiroSection } from './EventoResumoFinanceiroSection';
import { EventoViewPageHeader } from './EventoViewPageHeader';
import { EventoViewPageNavAtalhos } from './EventoViewPageNavAtalhos';
import { EventoViewPageStatusBar } from './EventoViewPageStatusBar';

export default function EventoViewPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useCurrentUser();
  const { showToast } = useToast();
  const { temPermissao, statusPlano } = usePlano();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copied, setCopied] = useState(false);
  const [temAcessoCopiar, setTemAcessoCopiar] = useState<boolean | null>(null);
  const [temAcessoContrato, setTemAcessoContrato] = useState<boolean | null>(null);
  const [eventoLocal, setEventoLocal] = useState<Evento | null>(null);
  const [alocacoesEvento, setAlocacoesEvento] = useState<AgendamentoAlocacao[]>([]);
  const [profissionaisAlocacao, setProfissionaisAlocacao] = useState<Map<string, string>>(new Map());
  const [linkAssinaturaChave, setLinkAssinaturaChave] = useState<string | null>(null);

  const { data: evento, loading: loadingEvento, error: errorEvento, refetch: refetchEvento } = useEvento(
    params.id as string
  );
  const { data: pagamentos, loading: loadingPagamentos, refetch: refetchPagamentos } = usePagamentosPorEvento(
    params.id as string
  );
  const { data: custos, loading: loadingCustos, refetch: refetchCustos } = useCustosPorEvento(params.id as string);
  const { data: servicos, loading: loadingServicos, refetch: refetchServicos } = useServicosPorEvento(
    params.id as string
  );
  const { anexos, loading: loadingAnexos, refetch: refetchAnexos } = useAnexos(params.id as string);
  const { data: contratos, loading: loadingContratos, refetch: refetchContratos } = useContratosPorEvento(
    params.id as string
  );

  const loading =
    loadingEvento || loadingPagamentos || loadingCustos || loadingServicos || loadingAnexos || loadingContratos;

  useEffect(() => {
    const verificarAcesso = async () => {
      const acesso = await temPermissao('BOTAO_COPIAR');
      setTemAcessoCopiar(acesso);
    };
    verificarAcesso();
  }, [temPermissao]);

  useEffect(() => {
    const verificarAcessoContrato = async () => {
      const acesso = await temPermissao('CONTRATO_AUTOMATIZADO');
      setTemAcessoContrato(acesso);
    };
    verificarAcessoContrato();
  }, [temPermissao]);

  useEffect(() => {
    if (evento) {
      setEventoLocal(evento);
    }
  }, [evento]);

  useEffect(() => {
    const carregarAgendamento = async () => {
      if (!userId || !evento?.id) {
        return;
      }

      try {
        const [alocacoes, profissionais] = await Promise.all([
          dataService.getAgendamentoAlocacoesPorEvento(userId, evento.id),
          dataService.getAgendamentoProfissionaisAtivos(userId),
        ]);
        setAlocacoesEvento(alocacoes);
        setProfissionaisAlocacao(new Map(profissionais.map((item) => [item.id, item.nome])));
      } catch {
        setAlocacoesEvento([]);
        setProfissionaisAlocacao(new Map());
      }
    };

    carregarAgendamento();
  }, [userId, evento?.id]);

  if (loading) {
    return (
      <Layout>
        <div className="flex h-64 flex-col items-center justify-center">
          <LoadingHotmart size="sm" />
          <p className="mt-4 text-text-secondary">Carregando evento...</p>
        </div>
      </Layout>
    );
  }

  if (errorEvento) {
    return (
      <Layout>
        <div className="flex h-64 items-center justify-center">
          <div className="text-error">Erro ao carregar evento: {errorEvento}</div>
        </div>
      </Layout>
    );
  }

  if (!evento) {
    return (
      <Layout>
        <div className="py-12 text-center">
          <CalendarIcon className="mx-auto h-12 w-12 text-text-muted" />
          <h3 className="mt-2 text-sm font-medium text-text-primary">Evento não encontrado</h3>
          <p className="mt-1 text-sm text-text-secondary">
            O evento que você está procurando não existe ou foi removido.
          </p>
          <div className="mt-6">
            <Button type="button" onClick={() => router.push('/eventos')}>
              <ArrowLeftIcon className="mr-2 h-4 w-4" />
              Voltar para Eventos
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  const handleDelete = async () => {
    if (!evento || !userId) return;

    try {
      await dataService.deleteEvento(evento.id, userId);
      showToast('Evento arquivado com sucesso!', 'success');
      router.push('/eventos');
    } catch {
      showToast('Erro ao arquivar evento', 'error');
    }
  };

  const handlePagamentosChange = () => {
    refetchPagamentos();
  };

  const handleCustosChange = () => {
    refetchCustos();
  };

  const handleServicosChange = () => {
    refetchServicos();
    refetchEvento();
  };

  const handleAnexosChange = () => {
    refetchAnexos();
  };

  const solicitarLinkSignatarioNoEvento = async (
    contrato: Contrato,
    signatarioId: string,
    modo: 'gerar' | 'copiar'
  ) => {
    if (!podeGerarLinkAssinaturaContrato(contrato.status, contrato.pdfPath)) {
      showToast('Gere o PDF do contrato antes de criar o link de assinatura.', 'error');
      return;
    }
    setLinkAssinaturaChave(`${contrato.id}:${signatarioId}`);
    try {
      await solicitarLinkAssinaturaSignatario({
        contratoId: contrato.id,
        signatarioId,
        modo,
        showToast,
        aoConcluirComSucesso: refetchContratos,
      });
    } finally {
      setLinkAssinaturaChave(null);
    }
  };

  const handleCopyInfo = async () => {
    if (!temAcessoCopiar) {
      showToast('Esta funcionalidade está disponível apenas nos planos Profissional e Premium', 'error');
      return;
    }

    const text = formatarTextoEventoParaCopiar(evento, alocacoesEvento, profissionaisAlocacao, servicos || []);

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch {
        /* fallback abaixo */
      }
    }

    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.width = '2em';
      textArea.style.height = '2em';
      textArea.style.padding = '0';
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
      textArea.style.background = 'transparent';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* silencioso */
    }
  };

  const handleStatusChange = async (eventoId: string, novoStatus: string) => {
    if (!userId || !eventoLocal) {
      showToast('Usuário não autenticado', 'error');
      return;
    }

    const statusAnterior = eventoLocal.status;
    const novoStatusTyped = novoStatus as Evento['status'];

    setEventoLocal((prev) => (prev ? { ...prev, status: novoStatusTyped } : null));

    try {
      await dataService.updateEvento(eventoId, { status: novoStatusTyped }, userId);
      showToast('Status do evento atualizado com sucesso!', 'success');
      await refetchEvento();
    } catch {
      showToast('Erro ao atualizar status do evento', 'error');
      setEventoLocal((prev) => (prev ? { ...prev, status: statusAnterior } : null));
    }
  };

  const gerarPdfContrato = async (contrato: Contrato) => {
    try {
      const response = await fetch(`/api/contratos/${contrato.id}/gerar-pdf`, {
        method: 'POST',
      });
      if (response.ok) {
        const result = await response.json();
        const pdfData = result.data || result;
        showToast('PDF gerado com sucesso', 'success');
        if (pdfData.pdfUrl) {
          window.open(pdfData.pdfUrl, '_blank');
        }
        refetchContratos();
      } else {
        const errorData = await response.json();
        showToast(errorData.error || 'Erro ao gerar PDF', 'error');
      }
    } catch {
      showToast('Erro ao gerar PDF', 'error');
    }
  };

  const totalCustos =
    custos?.filter((custo) => !custo.removido).reduce((total, custo) => total + custo.valor * (custo.quantidade || 1), 0) ||
    0;
  const valorTotalCobrado = eventoLocal?.valorTotal ?? evento.valorTotal ?? 0;
  const totalServicosCalculado =
    eventoLocal?.valorTotalServicosCalculado ??
    evento.valorTotalServicosCalculado ??
    (servicos
      ?.filter((servico) => !servico.removido)
      .reduce((total, servico) => {
        const quantidade = servico.quantidade || 1;
        const valorUnitario = servico.valorUnitario ?? servico.tipoServico?.valorPadrao ?? 0;
        const totalItem = servico.valorTotalItem ?? quantidade * valorUnitario;
        return total + totalItem;
      }, 0) ?? 0);
  const modoValorTotal = eventoLocal?.modoValorTotal || evento.modoValorTotal || 'manual';
  const divergenciaTotal = valorTotalCobrado - totalServicosCalculado;
  const temDivergencia = Math.abs(divergenciaTotal) > 0.01;

  return (
    <Layout>
      <div className="space-y-6">
        <EventoViewPageHeader
          evento={evento}
          copied={copied}
          temAcessoCopiar={temAcessoCopiar}
          temAcessoContrato={temAcessoContrato}
          statusPlano={statusPlano}
          onVoltar={() => router.push('/eventos')}
          onNovoContrato={() => router.push(`/contratos/novo?eventoId=${evento.id}`)}
          onVerAssinatura={() => router.push('/assinatura')}
          onCopiarInfo={() => void handleCopyInfo()}
          onEditar={() => router.push(`/eventos/${params.id}/editar`)}
          onArquivar={() => setShowDeleteConfirm(true)}
        />

        <EventoViewPageNavAtalhos />

        <EventoViewPageStatusBar
          eventoId={eventoLocal?.id || evento.id}
          statusAtual={eventoLocal?.status || evento.status}
          dataCadastro={evento.dataCadastro}
          onStatusChange={handleStatusChange}
        />

        <EventoBasicoSection
          evento={evento}
          alocacoesEvento={alocacoesEvento}
          profissionaisAlocacao={profissionaisAlocacao}
          onGerenciarAgendamento={() => router.push(`/agendamento?eventoId=${evento.id}`)}
        />

        <EventoResumoFinanceiroSection
          valorTotalCobrado={valorTotalCobrado}
          totalCustos={totalCustos}
          totalServicosCalculado={totalServicosCalculado}
          modoValorTotal={modoValorTotal}
          temDivergencia={temDivergencia}
          divergenciaTotal={divergenciaTotal}
        />

        <div id="pagamentos" className="pt-4">
          <PagamentoHistorico
            eventoId={evento.id}
            pagamentos={pagamentos || []}
            onPagamentosChange={handlePagamentosChange}
            evento={evento}
          />
        </div>

        <div id="custos" className="pt-4">
          <CustosEvento evento={evento} custos={custos || []} onCustosChange={handleCustosChange} />
        </div>

        <div id="servicos" className="pt-4">
          <ServicosEvento evento={evento} servicos={servicos || []} onServicosChange={handleServicosChange} />
        </div>

        <div id="anexos" className="pt-4">
          <AnexosEvento evento={evento} anexos={anexos || []} onAnexosChange={handleAnexosChange} />
        </div>

        <EventoContratosSection
          contratos={contratos}
          loadingContratos={loadingContratos}
          temAcessoContrato={temAcessoContrato}
          linkAssinaturaChave={linkAssinaturaChave}
          onNovoContrato={() => router.push(`/contratos/novo?eventoId=${evento.id}`)}
          onEditarContrato={(contratoId) => router.push(`/contratos/${contratoId}`)}
          onGerarPdf={gerarPdfContrato}
          onSolicitarLinkSignatario={(c, sid, modo) => void solicitarLinkSignatarioNoEvento(c, sid, modo)}
        />

        <ConfirmationDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Arquivar Evento"
          description={
            evento
              ? `Tem certeza que deseja arquivar o evento "${evento.nomeEvento || evento.cliente.nome}"? Ele não aparecerá nas listas ativas, mas continuará disponível nos relatórios históricos.`
              : 'Tem certeza que deseja arquivar este evento?'
          }
          confirmText="Arquivar"
          cancelText="Cancelar"
          variant="default"
          onConfirm={handleDelete}
        />
      </div>
    </Layout>
  );
}
