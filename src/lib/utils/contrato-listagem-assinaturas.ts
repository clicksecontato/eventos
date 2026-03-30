import type { Contrato, ContratoSignatarioListagem } from '@/types';

export const ROTULO_PAPEL_PARTE_LISTAGEM: Record<string, string> = {
  cliente: 'Cliente',
  contratante: 'Contratante',
  contratada: 'Contratada',
  testemunha: 'Testemunha',
  representante: 'Representante',
  outro: 'Outro',
};

export function rotuloPapelParteParaListagem(papel: string): string {
  return ROTULO_PAPEL_PARTE_LISTAGEM[papel] || papel;
}

const ROTULO_STATUS_DB: Record<Contrato['status'], string> = {
  rascunho: 'Rascunho',
  gerado: 'Gerado',
  assinado: 'Assinado',
  document_closed: 'Documento fechado',
  cancelado: 'Cancelado',
};

const ROTULO_STATUS_SIGNATARIO: Record<string, string> = {
  pendente: 'Pendente',
  convite_enviado: 'Convite enviado',
  assinado: 'Assinado',
  recusado: 'Recusado',
  expirado: 'Expirado',
};

export function obterRotuloStatusSignatarioListagem(status: string): string {
  return ROTULO_STATUS_SIGNATARIO[status] || status;
}

/** Classes Tailwind para chip de status do signatário (lista /contratos, card em evento). */
export function classeChipStatusSignatarioListagem(status: string): string {
  if (status === 'assinado') {
    return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100';
  }
  if (status === 'recusado') {
    return 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-100';
  }
  return 'bg-muted/80 text-text-secondary';
}

export type ExibicaoStatusContratoLista =
  | { tipo: 'simples'; statusDb: Contrato['status']; rotulo: string }
  | {
      tipo: 'colhendo';
      rotulo: string;
      assinados: number;
      total: number;
    }
  | { tipo: 'assinado_todos_signatarios'; rotulo: string; total: number };

type ContratoComListagem = Contrato & { signatariosListagem?: ContratoSignatarioListagem[] };

/**
 * Status exibido na lista de contratos: distingue "Assinado" completo de "Colhendo assinaturas"
 * quando há signatários cadastrados nas partes.
 */
export function obterExibicaoStatusContratoNaLista(contrato: ContratoComListagem): ExibicaoStatusContratoLista {
  const sigs = contrato.signatariosListagem ?? [];

  if (contrato.status !== 'assinado' || sigs.length === 0) {
    return {
      tipo: 'simples',
      statusDb: contrato.status,
      rotulo: ROTULO_STATUS_DB[contrato.status] || contrato.status,
    };
  }

  const assinados = sigs.filter((s) => s.status === 'assinado').length;
  if (assinados === sigs.length) {
    return { tipo: 'assinado_todos_signatarios', rotulo: 'Assinado', total: sigs.length };
  }

  return {
    tipo: 'colhendo',
    rotulo: 'Colhendo assinaturas',
    assinados,
    total: sigs.length,
  };
}

/** Filtro da página /contratos (valor do select de status). */
export function contratoPassaFiltroStatusLista(contrato: ContratoComListagem, filtroStatus: string): boolean {
  if (!filtroStatus) return true;

  if (filtroStatus === 'colhendo_assinaturas') {
    return obterExibicaoStatusContratoNaLista(contrato).tipo === 'colhendo';
  }

  if (filtroStatus === 'assinado') {
    if (contrato.status !== 'assinado' && contrato.status !== 'document_closed') return false;
    const ex = obterExibicaoStatusContratoNaLista(contrato);
    return ex.tipo !== 'colhendo';
  }

  return contrato.status === filtroStatus;
}
