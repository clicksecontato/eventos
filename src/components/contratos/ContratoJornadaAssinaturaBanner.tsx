'use client';

import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { DocumentTextIcon, LinkIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { podeGerarLinkAssinaturaContrato } from '@/lib/utils/contrato-link-signatario-client';
import type { Contrato } from '@/types';

export interface ContratoJornadaAssinaturaBannerProps {
  contrato: Contrato;
  onIrParaPartes: () => void;
  onGerarPdf: () => void;
  onAbrirGerarLink: () => void;
  gerandoPdf?: boolean;
}

function passo(feito: boolean, titulo: string, descricao: string, icone: ReactNode) {
  return (
    <div className="flex gap-3 rounded-lg border border-border/80 bg-background/60 px-3 py-2.5">
      <div className="mt-0.5 shrink-0">
        {feito ? (
          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-500" aria-hidden />
        ) : (
          <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/40 text-[10px] font-semibold text-muted-foreground">
            …
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-medium text-text-primary">
          <span className="text-muted-foreground">{icone}</span>
          {titulo}
        </div>
        <p className="mt-0.5 text-xs text-text-secondary">{descricao}</p>
      </div>
    </div>
  );
}

/**
 * Checklist da jornada até enviar o contrato para assinatura (sem ICP).
 */
export function ContratoJornadaAssinaturaBanner({
  contrato,
  onIrParaPartes,
  onGerarPdf,
  onAbrirGerarLink,
  gerandoPdf = false,
}: ContratoJornadaAssinaturaBannerProps) {
  const pdfOk = Boolean(contrato.pdfPath?.trim());
  const podeLink = podeGerarLinkAssinaturaContrato(contrato.status, contrato.pdfPath);
  const signatarios = contrato.signatariosListagem ?? [];
  const totalSig = signatarios.length;
  const assinados = signatarios.filter((s) => s.status === 'assinado').length;
  const todosAssinaramLista = totalSig > 0 && assinados === totalSig;
  const contratoAssinado = contrato.status === 'assinado' || contrato.status === 'document_closed';

  if (contrato.status === 'cancelado') {
    return (
      <div className="mb-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-text-secondary">
        Contrato cancelado — ações de PDF e assinatura não se aplicam.
      </div>
    );
  }

  if (contratoAssinado) {
    // O backend atual marca o contrato como "assinado" após o primeiro signatário.
    // Para não mentir na UI, quando há lista de signatários e não está 100%, mostramos "colhendo".
    if (totalSig > 0 && assinados !== totalSig) {
      return (
        <div className="mb-6 rounded-lg border border-amber-500/35 bg-amber-500/5 px-4 py-3">
          <p className="text-sm font-medium text-text-primary">Colhendo assinaturas</p>
          <p className="mt-1 text-xs text-text-secondary">
            {assinados} de {totalSig} signatário(s) concluíram a assinatura.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onIrParaPartes}>
              Abrir Partes
            </Button>
            {podeLink && !todosAssinaramLista && (
              <Button type="button" size="sm" onClick={onAbrirGerarLink}>
                <LinkIcon className="mr-1.5 h-4 w-4" />
                Gerar link para assinar
              </Button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-lg border border-green-600/30 bg-green-500/5 px-4 py-3">
        <p className="text-sm font-medium text-text-primary">
          {contrato.status === 'document_closed' ? 'Documento fechado' : 'Contrato assinado'}
        </p>
        {totalSig > 0 ? (
          <p className="mt-1 text-xs text-text-secondary">
            {assinados} de {totalSig} signatário(s) registrados nesta listagem concluíram a assinatura.
          </p>
        ) : (
          <p className="mt-1 text-xs text-text-secondary">Processo de assinatura concluído.</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-border bg-muted/20 px-4 py-4">
      <p className="mb-3 text-sm font-semibold text-text-primary">Próximos passos</p>
      <div className="space-y-2">
        {passo(
          pdfOk,
          'Gerar o PDF do contrato',
          pdfOk
            ? 'Documento fechado para envio e assinatura.'
            : 'Enquanto for rascunho, gere o PDF para habilitar assinatura e links.',
          <DocumentTextIcon className="h-4 w-4" aria-hidden />
        )}
        {passo(
          totalSig > 0,
          'Partes e signatários (opcional)',
          totalSig > 0
            ? `${totalSig} signatário(s) cadastrado(s). Gere um link por pessoa na aba Partes ou pelo botão Gerar link.`
            : 'Sem partes na listagem: você pode cadastrar na aba Partes ou gerar link com nome e e-mail no modal.',
          <UserGroupIcon className="h-4 w-4" aria-hidden />
        )}
      </div>
      {pdfOk && totalSig > 0 && !contratoAssinado && (
        <p className="mt-3 flex items-center gap-2 text-xs text-text-secondary">
          <LinkIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          {todosAssinaramLista
            ? 'Todos os signatários desta listagem assinaram.'
            : `Assinaturas: ${assinados} de ${totalSig} concluída(s) (dados da listagem).`}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {!pdfOk && contrato.status === 'rascunho' && (
          <Button type="button" size="sm" onClick={onGerarPdf} disabled={gerandoPdf}>
            {gerandoPdf ? 'Gerando PDF…' : 'Gerar PDF agora'}
          </Button>
        )}
        {pdfOk && !contratoAssinado && (
          <>
            <Button type="button" variant="outline" size="sm" onClick={onIrParaPartes}>
              Ir para Partes
            </Button>
            {podeLink && !todosAssinaramLista && (
              <Button type="button" size="sm" onClick={onAbrirGerarLink}>
                <LinkIcon className="mr-1.5 h-4 w-4" />
                Gerar link para assinar
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export interface ContratoJornadaAssinaturaCompactaProps {
  contrato: Contrato;
  onIrParaPartes: () => void;
  onGerarPdf: () => void;
  onGerarLink: () => void;
  gerandoPdf?: boolean;
}

/**
 * Resumo da jornada (PDF / partes / assinaturas) para cada card na lista `/contratos`.
 */
export function ContratoJornadaAssinaturaCompacta({
  contrato,
  onIrParaPartes,
  onGerarPdf,
  onGerarLink,
  gerandoPdf = false,
}: ContratoJornadaAssinaturaCompactaProps) {
  const pdfOk = Boolean(contrato.pdfPath?.trim());
  const podeLink = podeGerarLinkAssinaturaContrato(contrato.status, contrato.pdfPath);
  const signatarios = contrato.signatariosListagem ?? [];
  const totalSig = signatarios.length;
  const assinados = signatarios.filter((s) => s.status === 'assinado').length;
  const todosAssinaramLista = totalSig > 0 && assinados === totalSig;
  const contratoAssinado = contrato.status === 'assinado' || contrato.status === 'document_closed';

  if (contrato.status === 'cancelado') {
    return (
      <div className="mt-2 rounded-md border border-border/60 bg-muted/20 px-2 py-1.5 text-[11px] text-text-secondary">
        Contrato cancelado — sem fluxo de assinatura.
      </div>
    );
  }

  if (contratoAssinado) {
    if (totalSig > 0 && assinados !== totalSig) {
      return (
        <div className="mt-2 rounded-md border border-amber-500/35 bg-amber-500/5 px-2 py-1.5 text-[11px] text-text-primary">
          <span className="font-medium text-amber-800 dark:text-amber-300">Colhendo</span>
          <span className="text-text-secondary"> · {assinados}/{totalSig} assinaturas</span>
        </div>
      );
    }

    return (
      <div className="mt-2 rounded-md border border-green-600/25 bg-green-500/5 px-2 py-1.5 text-[11px] text-text-primary">
        <span className="font-medium text-green-700 dark:text-green-400">
          {contrato.status === 'document_closed' ? 'Documento fechado' : 'Assinado'}
        </span>
        {totalSig > 0 ? (
          <span className="text-text-secondary"> · {assinados}/{totalSig} na listagem</span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mt-2 rounded-md border border-border/70 bg-muted/25 px-2 py-2 text-[11px]">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-text-secondary">
        <span className="font-semibold text-text-primary">Jornada</span>
        <span className="text-muted-foreground">·</span>
        <span className={pdfOk ? 'text-green-700 dark:text-green-400' : ''}>
          {pdfOk ? 'PDF ok' : 'Falta PDF'}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className={totalSig > 0 ? 'text-green-700 dark:text-green-400' : ''}>
          {totalSig > 0 ? `${totalSig} signat.` : 'Sem signat. na lista'}
        </span>
        {pdfOk && totalSig > 0 ? (
          <>
            <span className="text-muted-foreground">·</span>
            <span>
              {todosAssinaramLista ? 'Todos assinaram' : `${assinados}/${totalSig} assin.`}
            </span>
          </>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!pdfOk && contrato.status === 'rascunho' && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-7 px-2 text-[11px]"
            disabled={gerandoPdf}
            onClick={onGerarPdf}
          >
            {gerandoPdf ? 'Gerando…' : 'Gerar PDF'}
          </Button>
        )}
        {pdfOk && (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-[11px]"
              onClick={onIrParaPartes}
            >
              Abrir Partes
            </Button>
            {podeLink && !todosAssinaramLista && (
              <Button type="button" size="sm" className="h-7 px-2 text-[11px]" onClick={onGerarLink}>
                <LinkIcon className="mr-1 h-3 w-3" aria-hidden />
                Gerar link
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
