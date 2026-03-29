'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  LockClosedIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Lock } from 'lucide-react';
import type { PlanoStatus } from '@/lib/services/assinatura-service';
import type { Evento } from '@/types';
import { formatarDiaSemanaTitulo } from './evento-view-format';

type Props = {
  evento: Evento;
  copied: boolean;
  temAcessoCopiar: boolean | null;
  temAcessoContrato: boolean | null;
  statusPlano: PlanoStatus | null;
  onVoltar: () => void;
  onNovoContrato: () => void;
  onVerAssinatura: () => void;
  onCopiarInfo: () => void;
  onEditar: () => void;
  onArquivar: () => void;
};

export function EventoViewPageHeader({
  evento,
  copied,
  temAcessoCopiar,
  temAcessoContrato,
  statusPlano,
  onVoltar,
  onNovoContrato,
  onVerAssinatura,
  onCopiarInfo,
  onEditar,
  onArquivar,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-bold leading-tight text-text-primary">
          {evento.nomeEvento || evento.cliente.nome}
        </h1>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex items-start gap-2 text-text-primary">
            <UserIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-text-muted" />
            <span className="break-words font-medium">{evento.cliente.nome}</span>
          </div>
          <p className="text-xs text-text-muted">
            {format(evento.dataEvento, 'dd/MM/yyyy', { locale: ptBR })} •{' '}
            {formatarDiaSemanaTitulo(evento.dataEvento instanceof Date ? evento.dataEvento : new Date(evento.dataEvento))}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="action-back" size="icon" type="button" onClick={onVoltar}>
                <ArrowLeftIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="font-medium">
              <p>Voltar para lista de eventos</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex items-center gap-2">
          {temAcessoContrato === true ? (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" type="button" onClick={onNovoContrato}>
                    <DocumentTextIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-medium">
                  <p>Gerar contrato</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" disabled size="icon" className="cursor-not-allowed opacity-50" type="button">
                      <LockClosedIcon className="h-5 w-5" />
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={8}
                  className="z-50 max-w-sm rounded-md border border-warning bg-warning-bg p-0 shadow-lg"
                  style={{
                    backgroundColor: 'var(--warning-bg)',
                    borderColor: 'var(--warning)',
                    color: 'var(--warning-text)',
                  }}
                >
                  <div className="space-y-4 p-4" style={{ color: 'var(--warning-text)' }}>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 flex-shrink-0" style={{ color: 'var(--warning-text)' }} />
                        <div className="font-semibold" style={{ color: 'var(--warning-text)' }}>
                          Acesso Bloqueado
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>
                        Preenchimento automatizado de contrato está disponível apenas para perfis com acesso Premium
                      </div>
                    </div>
                    {statusPlano?.plano?.nome && (
                      <div className="text-sm" style={{ color: 'var(--warning-text)', opacity: 0.8 }}>
                        Plano atual:{' '}
                        <span className="font-semibold" style={{ color: 'var(--warning-text)' }}>
                          {statusPlano.plano.nome}
                        </span>
                      </div>
                    )}
                    <Button size="sm" type="button" onClick={onVerAssinatura} className="w-full" variant="default">
                      Ver status da assinatura
                    </Button>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {temAcessoCopiar && (
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="action-copy"
                    size="icon"
                    type="button"
                    onClick={onCopiarInfo}
                    className={copied ? 'border-success bg-success-bg text-success-text' : ''}
                  >
                    {copied ? <CheckIcon className="h-5 w-5" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="font-medium">
                  <p>{copied ? 'Informações copiadas!' : 'Copiar informações do evento'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="action-edit" size="icon" type="button" onClick={onEditar}>
                  <PencilIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-medium">
                <p>Editar evento</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="action-delete" size="icon" type="button" onClick={onArquivar}>
                  <TrashIcon className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="font-medium">
                <p>Arquivar evento</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
