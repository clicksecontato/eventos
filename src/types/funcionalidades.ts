export type CategoriaFuncionalidade = 
  | 'EVENTOS' 
  | 'FINANCEIRO' 
  | 'RELATORIOS' 
  | 'INTEGRACAO' 
  | 'ADMIN';

export interface Funcionalidade {
  id: string;
  codigo: string;
  nome: string;
  descricao: string;
  categoria: CategoriaFuncionalidade;
  ativo: boolean;
  ordem: number;
  dataCadastro: Date;
}

export type StatusAssinatura = 
  | 'trial' 
  | 'active' 
  | 'cancelled' 
  | 'expired' 
  | 'suspended';

export interface Plano {
  id: string;
  nome: string;
  descricao: string;
  codigoHotmart: string;
  funcionalidades: string[]; // IDs das funcionalidades
  preco: number;
  intervalo: 'mensal' | 'anual';
  ativo: boolean;
  destaque: boolean;
  limiteEventos?: number;
  limiteClientes?: number;
  limiteUsuarios?: number;
  limiteArmazenamento?: number; // em GB
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface EventoHistoricoAssinatura {
  data: Date;
  acao: string;
  detalhes: any;
}

export interface Assinatura {
  id: string;
  userId: string;
  planoId?: string;
  hotmartSubscriptionId: string;
  status: StatusAssinatura;
  dataInicio: Date;
  dataFim?: Date;
  dataRenovacao?: Date;
  funcionalidadesHabilitadas: string[]; // IDs das funcionalidades
  historico: EventoHistoricoAssinatura[];
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface LimitesUsuario {
  eventosMesAtual: number;
  eventosLimiteMes?: number;
  clientesTotal: number;
  clientesLimite?: number;
  usuariosConta: number;
  usuariosLimite?: number;
  armazenamentoUsado: number; // em bytes
  armazenamentoLimite?: number; // em bytes
}

export interface PlanoComFuncionalidades extends Plano {
  funcionalidadesDetalhes: Funcionalidade[];
}

