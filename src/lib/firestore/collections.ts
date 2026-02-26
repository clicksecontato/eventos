// Definição das collections do Firestore com prefixo controle_

export const COLLECTIONS = {
  // Usuários do sistema (NextAuth) - Collection principal
  USERS: 'controle_users',
  
  // Subcollections de controle_users
  CLIENTES: 'clientes',
  EVENTOS: 'eventos',
  TIPO_EVENTOS: 'tipo_eventos',
  TIPO_CUSTOS: 'tipo_custos',
  TIPO_SERVICOS: 'tipo_servicos',
  CANAIS_ENTRADA: 'canais_entrada',
  RELATORIOS_CACHE: 'relatorios_cache',
  RELATORIOS_DIARIOS: 'relatorios',
  
  // Subcollections de eventos
  PAGAMENTOS: 'pagamentos',
  CUSTOS: 'custos',
  SERVICOS_EVENTO: 'servicos',
  
  // Collections globais (mantidas)
  HISTORICO_PAGAMENTOS: 'controle_historico_pagamentos',
  SERVICOS: 'controle_servicos',
  PACOTES_SERVICOS: 'controle_pacotes_servicos',
  CONTRATOS_SERVICOS: 'controle_contratos_servicos',
  PROMOTERS: 'controle_promoters',
  INSUMOS: 'controle_insumos',
  ANEXOS_EVENTOS: 'controle_anexos_eventos',
  
  // Google Calendar Integration (opcional)
  GOOGLE_CALENDAR_TOKENS: 'google_calendar_tokens',
  MODELOS_CONTRATO: 'modelos_contrato',
  CONFIGURACAO_CONTRATO: 'configuracao_contrato',
  CONTRATOS: 'contratos',
} as const;

// Estrutura das collections para documentação
export const COLLECTION_SCHEMAS = {
  [COLLECTIONS.USERS]: {
    id: 'string',
    email: 'string',
    name: 'string',
    role: 'string',
    createdAt: 'timestamp',
    updatedAt: 'timestamp'
  },
  
  [COLLECTIONS.CLIENTES]: {
    id: 'string',
    nome: 'string',
    cpf: 'string',
    email: 'string',
    telefone: 'string',
    endereco: 'string',
    cep: 'string',
    instagram: 'string?',
    canalEntradaId: 'string?',
    dataCadastro: 'timestamp'
    // userId removido - agora é parte do path da subcollection
  },
  
  [COLLECTIONS.CANAIS_ENTRADA]: {
    id: 'string',
    nome: 'string',
    descricao: 'string',
    ativo: 'boolean',
    dataCadastro: 'timestamp'
  },
  
  [COLLECTIONS.TIPO_EVENTOS]: {
    id: 'string',
    nome: 'string',
    descricao: 'string',
    ativo: 'boolean',
    dataCadastro: 'timestamp'
  },

  [COLLECTIONS.EVENTOS]: {
    id: 'string',
    clienteId: 'string',
    dataEvento: 'timestamp',
    diaSemana: 'string',
    local: 'string',
    endereco: 'string',
    tipoEvento: 'string',
    tipoEventoId: 'string?',
    horarioInicio: 'string',
    horarioInicioServico: 'string',
    horarioTerminoServico: 'string',
    horarioDesmontagem: 'string',
    tempoEvento: 'string',
    contratante: 'string',
    numeroConvidados: 'number',
    quantidadeMesas: 'number?',
    hashtag: 'string?',
    numeroImpressoes: 'number?',
    cerimonialista: 'object?',
    observacoes: 'string?',
    status: 'string',
    valorTotal: 'number',
    diaFinalPagamento: 'timestamp',
    dataCadastro: 'timestamp',
    dataAtualizacao: 'timestamp'
    // userId removido - agora é parte do path da subcollection
  },
  
  [COLLECTIONS.PAGAMENTOS]: {
    id: 'string',
    valor: 'number',
    dataPagamento: 'timestamp',
    formaPagamento: 'string',
    status: 'string',
    observacoes: 'string?',
    comprovante: 'string?',
    dataCadastro: 'timestamp',
    dataAtualizacao: 'timestamp'
    // eventoId removido - agora é parte do path da subcollection
  },
  
  [COLLECTIONS.TIPO_CUSTOS]: {
    id: 'string',
    nome: 'string',
    descricao: 'string',
    ativo: 'boolean',
    dataCadastro: 'timestamp'
    // userId removido - agora é parte do path da subcollection
  },
  
  [COLLECTIONS.CUSTOS]: {
    id: 'string',
    tipoCustoId: 'string',
    valor: 'number',
    quantidade: 'number?',
    observacoes: 'string?',
    dataCadastro: 'timestamp'
    // eventoId removido - agora é parte do path da subcollection
  },
  
  [COLLECTIONS.TIPO_SERVICOS]: {
    id: 'string',
    nome: 'string',
    descricao: 'string',
    ativo: 'boolean',
    dataCadastro: 'timestamp'
    // userId removido - agora é parte do path da subcollection
  },
  
  [COLLECTIONS.SERVICOS_EVENTO]: {
    id: 'string',
    tipoServicoId: 'string',
    observacoes: 'string?',
    dataCadastro: 'timestamp'
    // eventoId removido - agora é parte do path da subcollection
    // tipoServico removido - será carregado separadamente quando necessário
  },
  
  [COLLECTIONS.ANEXOS_EVENTOS]: {
    id: 'string',
    eventoId: 'string',
    nome: 'string',
    tipo: 'string',
    url: 'string',
    tamanho: 'number',
    dataUpload: 'timestamp'
  },
  
  [COLLECTIONS.RELATORIOS_DIARIOS]: {
    id: 'string',
    dateKey: 'string',
    dataGeracao: 'timestamp',
    dashboard: 'object'
  }
} as const;
