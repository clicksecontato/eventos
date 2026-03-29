'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ClipboardDocumentIcon, LinkIcon } from '@heroicons/react/24/outline';
import {
  classeChipStatusSignatarioListagem,
  obterRotuloStatusSignatarioListagem,
  rotuloPapelParteParaListagem,
} from '@/lib/utils/contrato-listagem-assinaturas';
import { podeGerarLinkAssinaturaContrato } from '@/lib/utils/contrato-link-signatario-client';
import type { Contrato } from '@/types';

export interface ContratoSignatariosLinksListaProps {
  contrato: Contrato;
  linkAssinaturaChave: string | null;
  onSolicitarLink: (signatarioId: string, modo: 'gerar' | 'copiar') => void;
  /** Classes da `<ul>`; padrão inclui `mt-3` (lista /contratos). No card do evento use sem `mt-3`. */
  classNameUl?: string;
}

const UL_PADRAO_LISTA =
  'mt-3 space-y-1.5 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs';

/**
 * Lista de signatários com status e ações Gerar link / Copiar link (mesmas regras da lista /contratos).
 */
export function ContratoSignatariosLinksLista({
  contrato,
  linkAssinaturaChave,
  onSolicitarLink,
  classNameUl,
}: ContratoSignatariosLinksListaProps) {
  const signatarios = contrato.signatariosListagem ?? [];
  if (signatarios.length === 0) return null;

  const podeLink = podeGerarLinkAssinaturaContrato(contrato.status, contrato.pdfPath);
  const ulClass = classNameUl ?? UL_PADRAO_LISTA;
  /** Uma operação por vez por contrato evita corrida entre POSTs que revogam convites e invalidam tokens. */
  const prefixoContrato = `${contrato.id}:`;
  const linkAssinaturaEmAndamentoNesteContrato =
    linkAssinaturaChave !== null && linkAssinaturaChave.startsWith(prefixoContrato);

  return (
    <TooltipProvider>
      <ul className={ulClass}>
        <li className="mb-1 font-medium text-text-secondary">Signatários</li>
        {signatarios.map((s) => {
          const carregandoLink = linkAssinaturaEmAndamentoNesteContrato;
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
                        onClick={() => onSolicitarLink(s.id, 'gerar')}
                      >
                        <LinkIcon className="mr-1 h-3.5 w-3.5" />
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
                        onClick={() => onSolicitarLink(s.id, 'copiar')}
                      >
                        <ClipboardDocumentIcon className="mr-1 h-3.5 w-3.5" />
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
        })}
      </ul>
    </TooltipProvider>
  );
}
