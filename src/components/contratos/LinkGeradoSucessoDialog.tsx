'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { tentarCopiarParaAreaTransferencia } from '@/lib/utils/contrato-link-signatario-client';
import { ArrowTopRightOnSquareIcon, ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export interface LinkGeradoSucessoDialogProps {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  link: string;
}

/**
 * Após gerar o link: copiar de novo ou abrir a página de assinatura (acessibilidade e fluxo claro).
 */
export function LinkGeradoSucessoDialog({ open, onOpenChange, link }: LinkGeradoSucessoDialogProps) {
  const { showToast } = useToast();

  const copiar = async () => {
    const ok = await tentarCopiarParaAreaTransferencia(link);
    showToast(ok ? 'Link copiado novamente.' : 'Não foi possível copiar; selecione o link manualmente.', ok ? 'success' : 'info');
  };

  const abrirNovaAba = () => {
    window.open(link, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link gerado</DialogTitle>
          <DialogDescription>
            Use copiar ou abrir em nova aba para testar ou enviar manualmente ao signatário.
          </DialogDescription>
        </DialogHeader>
        <p className="break-all rounded-md bg-muted/50 px-3 py-2 font-mono text-xs text-text-secondary">{link}</p>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button type="button" variant="outline" onClick={() => void copiar()}>
            <ClipboardDocumentIcon className="mr-2 h-4 w-4" />
            Copiar novamente
          </Button>
          <Button type="button" onClick={abrirNovaAba}>
            <ArrowTopRightOnSquareIcon className="mr-2 h-4 w-4" />
            Abrir em nova aba
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
