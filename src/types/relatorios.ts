// Tipos para sistema de cache de relatórios (Data Warehouse)

export interface RelatorioSnapshot {
  id?: string;
  userId: string;
  dataGeracao: Date;
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumoGeral: ResumoGeral;
  receitaMensal: ReceitaMensal[];
  eventosResumo: EventoResumo[];
  fluxoCaixa: FluxoCaixaMensal[];
  servicosResumo: ServicosResumo;
  canaisEntradaResumo: CanalEntradaResumo[];
  impressoesResumo: ImpressoesResumo;
  performanceEventos: PerformanceEvento[];
}

export interface ResumoGeral {
  totalEventos: number;
  totalClientes: number;
  receitaTotal: number;
  custosTotal: number;
  lucroTotal: number;
  receitaMedia: number;
  custoMedio: number;
  margemLucro: number;
}

export interface ReceitaMensal {
  mes: string; // yyyy-MM
  valor: number;
  quantidadePagamentos: number;
  receitaMedia: number;
  maiorPagamento: number;
  menorPagamento: number;
}

export interface EventoResumo {
  eventoId: string;
  clienteId: string;
  clienteNome: string;
  dataEvento: Date;
  tipoEvento: string;
  valorTotal: number;
  totalPago: number;
  valorPendente: number;
  valorAtrasado: number;
  quantidadePagamentos: number;
  custosTotal: number;
  servicosTotal: number;
  lucro: number;
  margemLucro: number;
  isAtrasado: boolean;
}

export interface FluxoCaixaMensal {
  mes: string; // yyyy-MM
  receitas: number;
  despesas: number;
  saldo: number;
  saldoAcumulado: number;
  receitasPorForma: Record<string, number>;
  despesasPorCategoria: Record<string, number>;
}

export interface ServicosResumo {
  servicosPorTipo: ServicoPorTipo[];
}

export interface ServicoPorTipo {
  tipoServicoId: string;
  tipoServicoNome: string;
  quantidade: number;
  eventosUtilizados: number;
  percentual: number;
}

export interface CanalEntradaResumo {
  canalEntradaId: string;
  canalEntradaNome: string;
  quantidadeLeads: number;
  quantidadeEventos: number;
  receitaTotal: number;
  taxaConversao: number;
  ticketMedio: number;
}

export interface ImpressoesResumo {
  totalImpressoes: number;
  eventosComImpressoes: number;
  eventosSemImpressoes: number;
  taxaUtilizacaoImpressoes: number;
  custoTotal: number;
  impressoesPorTipo: ImpressoesPorTipo[];
}

export interface ImpressoesPorTipo {
  tipoEvento: string;
  quantidade: number;
  percentual: number;
}

export interface PerformanceEvento {
  eventoId: string;
  nomeEvento: string;
  clienteNome: string;
  dataEvento: Date;
  tipoEvento: string;
  valorTotal: number;
  custosTotal: number;
  servicosTotal: number;
  lucro: number;
  margemLucro: number;
  status: string;
  totalPago: number;
  valorPendente: number;
}

// Tipos para detalhamento a receber (estrutura agregada por cliente)
export interface DetalhamentoReceber {
  totalPendente: number;
  totalAtrasado: number;
  totalReceber: number;
  clientes: ClienteDetalhamentoReceber[];
}

export interface ClienteDetalhamentoReceber {
  clienteId: string;
  clienteNome: string;
  totalPendente: number;
  totalAtrasado: number;
  totalReceber: number;
  eventos: EventoDetalhamentoReceber[];
}

export interface EventoDetalhamentoReceber {
  eventoId: string;
  nomeEvento: string;
  dataEvento: Date;
  dataFinalPagamento?: Date;
  valorPrevisto: number;
  valorPago: number;
  valorPendente: number;
  valorAtrasado: number;
  quantidadePagamentos: number;
  isAtrasado: boolean;
}

