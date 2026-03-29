'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronDownIcon, ChevronUpIcon, ClipboardDocumentIcon, LinkIcon } from '@heroicons/react/24/outline';
import {
  classeChipStatusSignatarioListagem,
  obterRotuloStatusSignatarioListagem,
  rotuloPapelParteParaListagem,
} from '@/lib/utils/contrato-listagem-assinaturas';
import { podeGerarLinkAssinaturaContrato } from '@/lib/utils/contrato-link-signatario-client';
import type { Contrato } from '@/types';

export interface ContratoSignatariosLinksListaProps {
  contrato: Contrato;
  /**
   * Fluxo unificado: abre o modal de gerar link (recomendado em /contratos e evento).
   * Se definido, tem precedência sobre `onSolicitarLink`.
   */
  onAbrirDialogGerarLink?: (signatarioId: string, modo: 'gerar' | 'copiar') => void;
  /** Fluxo direto na API (ex.: testes). */
  onSolicitarLink?: (signatarioId: string, modo: 'gerar' | 'copiar') => void;
  /** Com `onSolicitarLink`: bloqueia linha durante POST. Com modal: pode omitir. */
  linkAssinaturaChave?: string | null;
  /** Ex.: modal de link aberto para este contrato — desabilita botões. */
  bloquearAcoes?: boolean;
  /** Classes da `<ul>`; padrão inclui `mt-3` (lista /contratos). No card do evento use sem `mt-3`. */
  classNameUl?: string;
  /** Lista recolhível quando há muitos signatários. */
  colapsavel?: boolean;
  /** Acima deste número, inicia recolhida (se `colapsavel`). Padrão: 2. */
  limiteColapsar?: number;
}

const UL_PADRAO_LISTA =
  'mt-3 space-y-1.5 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs';

/**
 * Lista de signatários com status e ações Gerar link / Copiar link (mesmas regras da lista /contratos).
 */
export function ContratoSignatariosLinksLista({
  contrato,
  onAbrirDialogGerarLink,
  onSolicitarLink,
  linkAssinaturaChave = null,
  bloquearAcoes = false,
  classNameUl,
  colapsavel = true,
  limiteColapsar = 2,
}: ContratoSignatariosLinksListaProps) {
  const signatarios = contrato.signatariosListagem ?? [];
  const acao =
    onAbrirDialogGerarLink ??
    onSolicitarLink ??
    ((_id: string, _m: 'gerar' | 'copiar') => {
      console.warn('ContratoSignatariosLinksLista: defina onAbrirDialogGerarLink ou onSolicitarLink');
    });

  const deveColapsar = colapsavel && signatarios.length > limiteColapsar;
  const [expandido, setExpandido] = useState(!deveColapsar);

  useEffect(() => {
    if (!deveColapsar) {
      setExpandido(true);
    }
  }, [deveColapsar, signatarios.length]);

  if (signatarios.length === 0) return null;

  const podeLink = podeGerarLinkAssinaturaContrato(contrato.status, contrato.pdfPath);
  const ulClass = classNameUl ?? UL_PADRAO_LISTA;
  const prefixoContrato = `${contrato.id}:`;
  const linkAssinaturaEmAndamentoNesteContrato =
    linkAssinaturaChave !== null && linkAssinaturaChave.startsWith(prefixoContrato);
  const carregandoLink = bloquearAcoes || linkAssinaturaEmAndamentoNesteContrato;

  const listaItens = signatarios.map((s) => {
    const mostrarGerar =
      podeLink && (s.status === 'pendente' || s.status === 'expirado' || s.status === 'recusado');
    const mostrarCopiar = podeLink && s.status === 'convite_enviado';
    return (
      <li
        key={s.id}
        className="flex flex-wrap items-start gap-2 border-b border-border/60 pb-2 last:border-0 last:pb-0"
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium text-text-primary">{s.nome}</span>
          <span className="text-text-secondary">{s.email}</span>
          <span className="text-muted-foreground">· {rotuloPapelParteParaListagem(s.papelParte)}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium ${classeChipStatusSignatarioListagem(s.status)}`}
          >
            {obterRotuloStatusSignatarioListagem(s.status)}
          </span>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {mostrarGerar && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={carregandoLink}
                  aria-label={`Gerar link de assinatura para ${s.nome}`}
                  onClick={() => acao(s.id, 'gerar')}
                >
                  <LinkIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {carregandoLink ? '...' : 'Gerar link'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Criar link de assinatura e enviar por e-mail</p>
              </TooltipContent>
            </Tooltip>
          )}
          {mostrarCopiar && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={carregandoLink}
                  aria-label={`Gerar novo link e copiar para ${s.nome}`}
                  onClick={() => acao(s.id, 'copiar')}
                >
                  <ClipboardDocumentIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  {carregandoLink ? '...' : 'Copiar link'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Gera um novo link, copia e invalida o convite anterior</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </li>
    );
  });

  return (
    <TooltipProvider>
      <div className={ulClass}>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="font-medium text-text-secondary">
            Signatários ({signatarios.length})
          </span>
          {deveColapsar && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-text-secondary"
              aria-expanded={expandido}
              aria-controls={`signatarios-lista-${contrato.id}`}
              onClick={() => setExpandido((v) => !v)}
            >
              {expandido ? (
                <>
                  <ChevronUpIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Recolher
                </>
              ) : (
                <>
                  <ChevronDownIcon className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Expandir
                </>
              )}
            </Button>
          )}
        </div>
        <ul
          id={`signatarios-lista-${contrato.id}`}
          className="m-0 list-none space-y-1.5 p-0"
          hidden={deveColapsar && !expandido}
        >
          {listaItens}
        </ul>
      </div>
    </TooltipProvider>
  );
}
