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
    if (contrato.status !== 'assinado') return false;
    const ex = obterExibicaoStatusContratoNaLista(contrato);
    return ex.tipo !== 'colhendo';
  }

  return contrato.status === filtroStatus;
}
