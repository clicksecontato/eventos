'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  PencilIcon,
  PlusIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LoadingHotmart from '@/components/LoadingHotmart';
import { ContratoSignatariosLinksLista } from '@/components/contratos/ContratoSignatariosLinksLista';
import type { Contrato } from '@/types';

type Props = {
  contratos: Contrato[] | null | undefined;
  loadingContratos: boolean;
  temAcessoContrato: boolean | null;
  linkAssinaturaChave: string | null;
  onNovoContrato: () => void;
  onEditarContrato: (contratoId: string) => void;
  onGerarPdf: (contrato: Contrato) => Promise<void>;
  onSolicitarLinkSignatario: (contrato: Contrato, signatarioId: string, modo: 'gerar' | 'copiar') => void;
};

export function EventoContratosSection({
  contratos,
  loadingContratos,
  temAcessoContrato,
  linkAssinaturaChave,
  onNovoContrato,
  onEditarContrato,
  onGerarPdf,
  onSolicitarLinkSignatario,
}: Props) {
  return (
    <div id="contratos" className="pt-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contratos</CardTitle>
              <CardDescription>Gerencie os contratos deste evento</CardDescription>
            </div>
            {temAcessoContrato === true && (
              <Button type="button" onClick={onNovoContrato} className="bg-primary">
                <PlusIcon className="mr-2 h-4 w-4" />
                Novo Contrato
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingContratos ? (
            <div className="flex items-center justify-center py-8">
              <LoadingHotmart size="sm" />
              <span className="ml-2 text-text-secondary">Carregando contratos...</span>
            </div>
          ) : contratos && contratos.length > 0 ? (
            <div className="space-y-3">
              {contratos.map((contrato) => (
                <div
                  key={contrato.id}
                  className="space-y-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-hover"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className="h-5 w-5 shrink-0 text-text-muted" />
                        <div className="min-w-0">
                          <div className="font-medium text-text-primary">
                            {contrato.modeloContrato?.nome || 'Contrato sem modelo'}
                          </div>
                          <div className="text-sm text-text-secondary">
                            {contrato.numeroContrato && `Nº ${contrato.numeroContrato} • `}
                            Status: <span className="capitalize">{contrato.status}</span>
                            {contrato.dataGeracao &&
                              ` • ${format(new Date(contrato.dataGeracao), 'dd/MM/yyyy', { locale: ptBR })}`}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => onEditarContrato(contrato.id)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar Contrato</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {contrato.status === 'gerado' && contrato.pdfUrl ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => window.open(contrato.pdfUrl, '_blank')}
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Baixar PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : contrato.status === 'rascunho' ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void onGerarPdf(contrato)}
                              >
                                <PrinterIcon className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Gerar PDF</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                    </div>
                  </div>
                  <ContratoSignatariosLinksLista
                    contrato={contrato}
                    linkAssinaturaChave={linkAssinaturaChave}
                    classNameUl="space-y-1.5 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs"
                    onSolicitarLink={(signatarioId, modo) => onSolicitarLinkSignatario(contrato, signatarioId, modo)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-text-secondary">
              <DocumentTextIcon className="mx-auto mb-4 h-12 w-12 text-text-muted opacity-50" />
              <p className="mb-4">Nenhum contrato encontrado para este evento</p>
              {temAcessoContrato === true ? (
                <Button type="button" onClick={onNovoContrato} variant="outline">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Criar Primeiro Contrato
                </Button>
              ) : (
                <p className="text-sm text-text-muted">
                  Contratos automatizados estão disponíveis apenas no plano Premium
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
