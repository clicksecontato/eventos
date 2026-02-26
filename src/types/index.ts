// Tipos baseados na análise das planilhas CLICK-SE

/**
 * Informações de assinatura consolidadas no documento do usuário
 */
export interface UserAssinatura {
  id?: string; // ID da assinatura na coleção assinaturas
  planoId?: string; // ID do plano atual
  planoNome?: string; // Nome do plano (cache)
  planoCodigoHotmart?: string; // Código do plano na Hotmart (cache)
  funcionalidadesHabilitadas?: string[]; // IDs das funcionalidades (cache)
  status?: 'ATIVA' | 'TRIAL' | 'CANCELADA' | 'EXPIRADA' | 'SUSPENSA';
  pagamentoEmDia?: boolean;
  dataExpira?: Date; // Data de expiração da assinatura
  dataProximoPagamento?: Date; // Data do próximo pagamento
  ultimaSincronizacao?: Date; // Quando foi sincronizado pela última vez
}

export interface User {
  id: string;
  email: string;
  nome: string;
  role: 'admin' | 'user';
  ativo: boolean;
  
  // Assinatura consolidada em um objeto
  assinatura?: UserAssinatura;
  
  // Metadados
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface CanalEntrada {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  dataCadastro: Date;
}

export interface Cliente {
  id: string;
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  endereco: string;
  cep: string;
  instagram?: string;
  canalEntradaId?: string;
  canalEntrada?: CanalEntrada;
  arquivado?: boolean;
  dataArquivamento?: Date;
  motivoArquivamento?: string;
  dataCadastro: Date;
}

export interface TipoEvento {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  dataCadastro: Date;
}

export interface Evento {
  id: string;
  nomeEvento?: string;
  clienteId: string;
  cliente: Cliente;
  dataEvento: Date;
  diaSemana: string;
  local: string;
  endereco: string;
  tipoEvento: string;
  tipoEventoId?: string;
  saida: string;
  chegadaNoLocal: string;
  horarioInicio: string;
  horarioDesmontagem: string;
  tempoEvento: string;
  contratante: string;
  numeroConvidados: number;
  quantidadeMesas?: number;
  hashtag?: string;
  numeroImpressoes?: number;
  cerimonialista?: {
    nome?: string;
    telefone?: string;
  };
  observacoes?: string;
  status: 'Agendado' | 'Confirmado' | 'Em andamento' | 'Concluído' | 'Cancelado';
  valorTotal: number; // Valor total a ser pago pelo evento
  diaFinalPagamento: Date; // Dia final para pagamento completo
  arquivado?: boolean;
  dataArquivamento?: Date;
  motivoArquivamento?: string;
  dataCadastro: Date;
  dataAtualizacao: Date;
  // Campos opcionais para integração com Google Calendar
  googleCalendarEventId?: string;
  googleCalendarSyncedAt?: Date;
}

export interface Servico {
  id: string;
  nome: string;
  descricao: string;
  categoria: 'Totem' | 'Instaclick' | 'P360' | 'Lambe-lambe' | 'Clickbook' | 'Personalização' | 'Pacote';
  duracao: number; // em horas
  precoBase: number;
  ativo: boolean;
}

export interface PacoteServico {
  id: string;
  nome: string;
  descricao: string;
  servicos: Servico[];
  precoTotal: number;
  desconto?: number;
  ativo: boolean;
}

export interface ContratoServico {
  id: string;
  eventoId: string;
  evento: Evento;
  servicoId?: string;
  servico?: Servico;
  pacoteId?: string;
  pacote?: PacoteServico;
  servicosContratados: Servico[];
  valorTotal: number;
  valorSinal: number;
  valorRestante: number;
  formaPagamento: 'À vista' | 'Parcelado' | 'Cartão de crédito' | 'Depósito bancário' | 'PIX';
  parcelas?: number;
  dataInicioParcelas?: Date;
  diaVencimento?: number;
  observacoes?: string;
  status: 'Pendente' | 'Ativo' | 'Pausado' | 'Cancelado' | 'Concluído';
  dataContrato: Date;
  dataAtualizacao: Date;
}

export interface CampoContrato {
  id: string;
  chave: string;
  label: string;
  tipo: 'text' | 'number' | 'date' | 'currency' | 'textarea' | 'select';
  obrigatorio: boolean;
  valorPadrao?: string;
  opcoes?: string[];
  ordem: number;
}

export interface ModeloContrato {
  id: string;
  nome: string;
  descricao?: string;
  template: string;
  campos: CampoContrato[];
  ativo: boolean;
  userId?: string; // NULL = modelo global (padrão), preenchido = template privado do usuário
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface VariavelContrato {
  id: string;
  userId: string;
  chave: string; // Ex: "nome_empresa"
  label: string; // Ex: "Nome da Empresa"
  tipo: 'unica' | 'multipla'; // 'unica' = {{variavel}}, 'multipla' = [variavel]
  valorPadrao?: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface ConfiguracaoContrato {
  id: string;
  userId: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj: string;
  inscricaoEstadual?: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  contato: {
    telefone: string;
    email: string;
    site?: string;
  };
  dadosBancarios?: {
    banco: string;
    agencia: string;
    conta: string;
    tipo: 'corrente' | 'poupanca';
    pix?: string;
  };
  marcaDaguaUrl?: string;
  marcaDaguaS3Key?: string;
  marcaDaguaTamanhoPercentual?: number;
  foro?: string;
  cidade?: string;
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface Contrato {
  id: string;
  userId: string;
  eventoId?: string;
  evento?: Evento;
  modeloContratoId: string;
  modeloContrato?: ModeloContrato;
  dadosPreenchidos: Record<string, any>;
  /** HTML editado pelo usuário antes de salvar. Usado no PDF quando preenchido. */
  conteudoHtml?: string;
  status: 'rascunho' | 'gerado' | 'assinado' | 'cancelado';
  pdfUrl?: string;
  pdfPath?: string;
  numeroContrato?: string;
  dataGeracao: Date;
  dataAssinatura?: Date;
  assinadoPor?: string;
  observacoes?: string;
  dataCadastro: Date;
  dataAtualizacao: Date;
  criadoPor: string;
}

export interface Pagamento {
  id: string;
  userId: string; // ID do usuário que criou o pagamento
  eventoId: string;
  valor: number;
  dataPagamento: Date;
  formaPagamento: 'Dinheiro' | 'Cartão de crédito' | 'Depósito bancário' | 'PIX' | 'Transferência';
  status: 'Pago' | 'Pendente' | 'Atrasado' | 'Cancelado';
  observacoes?: string;
  comprovante?: string; // Campo texto mantido para compatibilidade
  anexoId?: string; // Referência para subcollection de anexos
  cancelado?: boolean;
  dataCancelamento?: Date;
  motivoCancelamento?: string;
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface AnexoPagamento {
  id: string;
  userId: string;
  eventoId: string;
  pagamentoId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  s3Key: string;
  url: string;
  dataUpload: Date;
  dataCadastro: Date;
}

export interface AnexoCusto {
  id: string;
  userId: string;
  eventoId: string;
  custoId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  s3Key: string;
  url: string;
  dataUpload: Date;
  dataCadastro: Date;
}

export interface Promoter {
  id: string;
  nome: string;
  telefone: string;
  email?: string;
  especialidades: string[];
  custoHora: number;
  ativo: boolean;
  dataCadastro: Date;
}

export interface AtribuicaoEvento {
  id: string;
  eventoId: string;
  evento: Evento;
  promoterId: string;
  promoter: Promoter;
  custo: number;
  observacoes?: string;
  dataAtribuicao: Date;
}

export interface Insumo {
  id: string;
  nome: string;
  descricao: string;
  custo: number;
  unidade: string;
  ativo: boolean;
}

export interface InsumoEvento {
  id: string;
  eventoId: string;
  evento: Evento;
  insumoId: string;
  insumo: Insumo;
  quantidade: number;
  custoTotal: number;
  dataAtribuicao: Date;
}

export interface RelatorioFinanceiro {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  receitas: {
    total: number;
    porFormaPagamento: Record<string, number>;
    porMes: Record<string, number>;
  };
  despesas: {
    total: number;
    promoters: number;
    insumos: number;
    outros: number;
  };
  lucro: number;
  margem: number;
}

export interface DashboardEventoResumo {
  id: string;
  clienteNome: string;
  local: string;
  tipoEvento: string;
  status: string;
  dataEvento: Date;
  chegadaNoLocal?: string;
}

export interface DashboardPeriodoResumo {
  id: string;
  label: string;
  meses: number;
  inicio: Date;
  fim: Date;
  eventos: number;
  receitaRecebida: number;
  pagamentosRecebidos: number;
  valorPendente: number;
  valorAtrasado: number;
  ticketMedio: number;
}

export interface DashboardData {
  eventosHoje: number;
  eventosHojeLista: DashboardEventoResumo[];
  eventosMes: number;
  receitaMes: number;
  receitaAno: number;
  pagamentosPendentes: number;
  valorPendente: number;
  valorAtrasado: number;
  eventosComValoresAtrasados?: number;
  eventosComValoresPendentes?: number;
  eventosProximos: DashboardEventoResumo[];
  pagamentosVencendo: Pagamento[];
  resumoFinanceiro: {
    receitaTotal: number;
    receitaMes: number;
    valorPendente: number;
    valorAtrasado: number;
    totalEventos: number;
    eventosConcluidos: number;
  };
  graficos: {
    receitaMensal: Array<{ mes: string; valor: number }>;
    eventosPorTipo: Array<{ tipo: string; quantidade: number }>;
    statusPagamentos: Array<{ status: string; quantidade: number }>;
  };
  periodosResumo?: DashboardPeriodoResumo[];
  lastUpdatedAt?: Date;
}

// Enums para facilitar o uso
export enum StatusEvento {
  AGENDADO = 'Agendado',
  CONFIRMADO = 'Confirmado',
  EM_ANDAMENTO = 'Em andamento',
  CONCLUIDO = 'Concluído',
  CANCELADO = 'Cancelado'
}

export enum StatusPagamento {
  PENDENTE = 'Pendente',
  PAGO = 'Pago',
  ATRASADO = 'Atrasado',
  CANCELADO = 'Cancelado'
}

export enum StatusContrato {
  PENDENTE = 'Pendente',
  ATIVO = 'Ativo',
  PAUSADO = 'Pausado',
  CANCELADO = 'Cancelado',
  CONCLUIDO = 'Concluído'
}

export enum FormaPagamento {
  A_VISTA = 'À vista',
  PARCELADO = 'Parcelado',
  CARTAO_CREDITO = 'Cartão de crédito',
  DEPOSITO_BANCARIO = 'Depósito bancário',
  PIX = 'PIX'
}

export const DEFAULT_TIPOS_EVENTO: Array<Pick<TipoEvento, 'nome' | 'descricao'>> = [
  { nome: 'Casamento', descricao: 'Cerimônias e recepções matrimoniais' },
  { nome: 'Aniversário infantil', descricao: 'Festas para crianças' },
  { nome: 'Aniversário adulto', descricao: 'Celebrações para adultos' },
  { nome: '15 anos', descricao: 'Festas de debutante' },
  { nome: 'Outros', descricao: 'Eventos personalizados ou diferentes do padrão' }
];

export interface TipoCusto {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  dataCadastro: Date;
}

export interface CustoEvento {
  id: string;
  eventoId: string;
  evento: Evento;
  tipoCustoId: string;
  tipoCusto: TipoCusto;
  valor: number;
  quantidade?: number;
  observacoes?: string;
  removido?: boolean;
  dataRemocao?: Date;
  motivoRemocao?: string;
  dataCadastro: Date;
}

export interface AnexoEvento {
  id: string;
  eventoId: string;
  evento: Evento;
  nome: string;
  tipo: 'PDF' | 'Imagem' | 'Documento' | 'Outro';
  url: string;
  tamanho: number; // em bytes
  dataUpload: Date;
}

export interface ResumoCustosEvento {
  custos: CustoEvento[];
  total: number;
  porCategoria: Record<string, number>;
  quantidadeItens: number;
}

export interface TipoServico {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  dataCadastro: Date;
}

export interface ServicoEvento {
  id: string;
  eventoId: string;
  tipoServicoId: string;
  tipoServico: TipoServico;
  observacoes?: string;
  removido?: boolean;
  dataRemocao?: Date;
  motivoRemocao?: string;
  dataCadastro: Date;
}

export interface ResumoServicosEvento {
  servicos: ServicoEvento[];
  quantidadeItens: number;
  porCategoria: Record<string, number>;
}

export interface RelatorioPerformanceEventos {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumoGeral: {
    totalEventos: number;
    eventosConcluidos: number;
    eventosCancelados: number;
    taxaConclusao: number;
    taxaCancelamento: number;
  };
  eventosPorStatus: Array<{
    status: string;
    quantidade: number;
    percentual: number;
  }>;
  eventosPorTipo: Array<{
    tipo: string;
    quantidade: number;
    percentual: number;
  }>;
  eventosPorMes: Array<{
    mes: string;
    ano: number;
    quantidade: number;
    receita: number;
  }>;
  eventosPorTrimestre: Array<{
    trimestre: string;
    ano: number;
    quantidade: number;
    receita: number;
  }>;
  sazonalidade: {
    mesMaisMovimentado: string;
    mesMenosMovimentado: string;
    trimestreMaisMovimentado: string;
    tipoEventoMaisPopular: string;
    tipoEventoMenosPopular: string;
  };
  tendencias: {
    crescimentoMensal: number;
    crescimentoTrimestral: number;
    previsaoProximoMes: number;
  };
}

// ============================================
// PRÉ-CADASTRO DE EVENTOS
// ============================================

export enum StatusPreCadastro {
  PENDENTE = 'pendente',
  PREENCHIDO = 'preenchido',
  CONVERTIDO = 'convertido',
  EXPIRADO = 'expirado',
  IGNORADO = 'ignorado'
}

export interface PreCadastroEvento {
  id: string;
  userId: string;
  
  // Dados do Cliente (preenchidos pelo cliente)
  clienteNome?: string;
  clienteEmail?: string;
  clienteTelefone?: string;
  clienteCpf?: string;
  clienteEndereco?: string;
  clienteCep?: string;
  clienteInstagram?: string;
  clienteCanalEntradaId?: string;
  clienteCanalEntrada?: CanalEntrada;
  
  // Dados do Evento (preenchidos pelo cliente)
  nomeEvento?: string;
  dataEvento?: Date;
  local?: string;
  endereco?: string;
  tipoEvento?: string;
  tipoEventoId?: string;
  tipoEventoObj?: TipoEvento;
  contratante?: string;
  numeroConvidados?: number;
  quantidadeMesas?: number;
  hashtag?: string;
  horarioInicio?: string;
  horarioTermino?: string; // Horário de Desmontagem (horarioDesmontagem no Evento)
  cerimonialista?: {
    nome?: string;
    telefone?: string;
  };
  observacoes?: string;
  
  // Metadados
  status: StatusPreCadastro;
  dataExpiracao: Date;
  dataPreenchimento?: Date;
  dataConversao?: Date;
  eventoId?: string;
  clienteId?: string;
  
  // Relacionamentos
  servicos?: PreCadastroServico[];
  
  // Timestamps
  dataCadastro: Date;
  dataAtualizacao: Date;
}

export interface PreCadastroServico {
  id: string;
  userId: string;
  preCadastroId: string;
  tipoServicoId: string;
  tipoServico?: TipoServico;
  observacoes?: string;
  removido?: boolean;
  dataRemocao?: Date;
  motivoRemocao?: string;
  dataCadastro: Date;
}

export interface RelatorioFluxoCaixa {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumoGeral: {
    receitaTotal: number;
    despesaTotal: number;
    saldoAtual: number;
    saldoAnterior: number;
    variacaoSaldo: number;
    percentualVariacao: number;
  };
  fluxoMensal: Array<{
    mes: string;
    ano: number;
    receitas: number;
    despesas: number;
    saldo: number;
    saldoAcumulado: number;
  }>;
  receitasPorFormaPagamento: Array<{
    formaPagamento: string;
    valor: number;
    percentual: number;
  }>;
  despesasPorCategoria: Array<{
    categoria: string;
    valor: number;
    percentual: number;
  }>;
  projecao: {
    proximos3Meses: Array<{
      mes: string;
      receitaProjetada: number;
      despesaProjetada: number;
      saldoProjetado: number;
    }>;
    tendencia: 'crescimento' | 'declinio' | 'estavel';
    confiabilidade: number; // 0-100
  };
  alertas: Array<{
    tipo: 'saldo_negativo' | 'declinio_receita' | 'aumento_despesas' | 'inadimplencia';
    mensagem: string;
    severidade: 'baixa' | 'media' | 'alta';
  }>;
}

export interface RelatorioServicos {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumoGeral: {
    totalServicos: number;
    tiposServicosUnicos: number;
    eventosComServicos: number;
    eventosSemServicos: number;
    taxaUtilizacaoServicos: number;
  };
  servicosPorTipo: Array<{
    tipoServico: string;
    quantidade: number;
    percentual: number;
    eventosUtilizando: number;
  }>;
  servicosPorEvento: Array<{
    eventoId: string;
    clienteNome: string;
    dataEvento: Date;
    tipoEvento: string;
    quantidadeServicos: number;
    tiposServicos: string[];
  }>;
  servicosPorMes: Array<{
    mes: string;
    ano: number;
    quantidadeServicos: number;
    tiposUnicos: number;
  }>;
  servicosPorTipoEvento: Array<{
    tipoEvento: string;
    quantidadeServicos: number;
    tiposMaisUtilizados: Array<{
      tipoServico: string;
      quantidade: number;
    }>;
  }>;
  tendencias: {
    servicoMaisUtilizado: string;
    servicoMenosUtilizado: string;
    crescimentoUtilizacao: number;
    tiposEmAlta: string[];
  };
  alertas: Array<{
    tipo: 'evento_sem_servicos' | 'servico_pouco_utilizado' | 'alta_concentracao';
    mensagem: string;
    severidade: 'baixa' | 'media' | 'alta';
  }>;
}

export interface RelatorioCanaisEntrada {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumoGeral: {
    totalClientes: number;
    canaisAtivos: number;
    clientesSemCanal: number;
    taxaPreenchimento: number;
  };
  clientesPorCanal: Array<{
    canalId: string;
    canalNome: string;
    quantidade: number;
    percentual: number;
    valorTotalEventos: number;
    ticketMedio: number;
  }>;
  clientesPorMes: Array<{
    mes: string;
    ano: number;
    totalClientes: number;
    porCanal: Record<string, number>;
  }>;
  conversaoPorCanal: Array<{
    canalNome: string;
    totalLeads: number;
    eventosGerados: number;
    taxaConversao: number;
    receitaGerada: number;
  }>;
  tendencias: {
    canalMaisEfetivo: string;
    canalMenosEfetivo: string;
    crescimentoLeads: number;
    canaisEmAlta: string[];
  };
  alertas: Array<{
    tipo: 'canal_inativo' | 'baixa_conversao' | 'clientes_sem_canal';
    mensagem: string;
    severidade: 'baixa' | 'media' | 'alta';
    clientesSemCanal?: Array<{
      id: string;
      nome: string;
      email: string;
      telefone: string;
      dataCadastro: Date;
    }>;
  }>;
}

export interface RelatorioImpressoes {
  periodo: {
    inicio: Date;
    fim: Date;
  };
  resumoGeral: {
    totalImpressoes: number;
    eventosComImpressoes: number;
    eventosSemImpressoes: number;
    taxaUtilizacaoImpressoes: number;
    custoMedioPorImpressao: number;
  };
  impressoesPorEvento: Array<{
    eventoId: string;
    clienteNome: string;
    dataEvento: Date;
    tipoEvento: string;
    quantidadeImpressoes: number;
    valorEvento: number;
    custoImpressaoPorEvento: number;
  }>;
  impressoesPorTipoEvento: Array<{
    tipoEvento: string;
    totalImpressoes: number;
    eventosComImpressoes: number;
    mediaImpressoesPorEvento: number;
    percentual: number;
  }>;
  impressoesPorMes: Array<{
    mes: string;
    ano: number;
    totalImpressoes: number;
    eventosComImpressoes: number;
    custoTotalImpressoes: number;
  }>;
  analiseCustoBeneficio: Array<{
    tipoEvento: string;
    valorMedioEvento: number;
    custoMedioImpressoes: number;
    percentualCustoImpressoes: number;
    roiImpressoes: number;
  }>;
  tendencias: {
    eventoComMaisImpressoes: string;
    eventoComMenosImpressoes: string;
    crescimentoImpressoes: number;
    tiposEventoMaisImpressos: string[];
  };
  alertas: Array<{
    tipo: 'evento_sem_impressoes' | 'alto_custo_impressoes' | 'baixa_utilizacao';
    mensagem: string;
    severidade: 'baixa' | 'media' | 'alta';
    eventosSemImpressoes?: Array<{
      id: string;
      clienteNome: string;
      dataEvento: Date;
      tipoEvento: string;
      nomeEvento: string;
    }>;
  }>;
}

// Valores Atrasados
export interface ValorAtrasado {
  eventoId: string;
  nomeEvento: string;
  dataEvento: Date;
  diaFinalPagamento: Date;
  valorTotal: number;
  totalPago: number;
  valorAtrasado: number;
  diasAtraso: number;
  cliente: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
  };
  evento?: Evento; // Opcional, para detalhes completos
}

export interface ValoresAtrasadosFiltros {
  clienteId?: string;
  dataInicio?: Date;
  dataFim?: Date;
  diasAtrasoMin?: number;
  diasAtrasoMax?: number;
  valorMin?: number;
  valorMax?: number;
  ordenarPor?: 'valorAtrasado' | 'diasAtraso' | 'dataEvento' | 'diaFinalPagamento' | 'clienteNome';
  ordem?: 'asc' | 'desc';
  limite?: number;
  offset?: number;
}
