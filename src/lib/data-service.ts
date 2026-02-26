import { repositoryFactory } from './repositories/repository-factory';
import {
  Cliente,
  Evento,
  Pagamento,
  TipoCusto,
  CustoEvento,
  TipoServico,
  ServicoEvento,
  CanalEntrada,
  AnexoEvento,
  DashboardData,
  ResumoCustosEvento,
  ResumoServicosEvento,
  TipoEvento,
  DEFAULT_TIPOS_EVENTO
} from '@/types';
import { initializeAllCollections, initializeTiposCusto } from './collections-init';
import { FuncionalidadeService } from './services/funcionalidade-service';
import { DashboardReportService } from './services/dashboard-report-service';
// RelatoriosReportService importado dinamicamente para evitar dependência circular

export class DataService {
  private clienteRepo = repositoryFactory.getClienteRepository();
  private eventoRepo = repositoryFactory.getEventoRepository();
  private pagamentoRepo = repositoryFactory.getPagamentoRepository();
  private tipoCustoRepo = repositoryFactory.getTipoCustoRepository();
  private custoEventoRepo = repositoryFactory.getCustoEventoRepository();
  private tipoServicoRepo = repositoryFactory.getTipoServicoRepository();
  private servicoEventoRepo = repositoryFactory.getServicoEventoRepository();
  private canalEntradaRepo = repositoryFactory.getCanalEntradaRepository();
  private tipoEventoRepo = repositoryFactory.getTipoEventoRepository();
  private _funcionalidadeService?: FuncionalidadeService;
  
  private get funcionalidadeService(): FuncionalidadeService {
    // Lazy initialization: só inicializar quando necessário e apenas no servidor
    if (!this._funcionalidadeService) {
      try {
        if (typeof window === 'undefined') {
          // No servidor, usar ServiceFactory com repositórios corretos (importação dinâmica)
          const { getServiceFactory } = require('./factories/service-factory');
          this._funcionalidadeService = getServiceFactory().getFuncionalidadeService();
        } else {
          // No cliente, criar instância básica (não será usado diretamente no cliente)
          // As operações no cliente devem usar API routes
          this._funcionalidadeService = new FuncionalidadeService();
        }
      } catch (error) {
        // Fallback: criar instância básica
        this._funcionalidadeService = new FuncionalidadeService();
      }
    }
    // Garantir que sempre retornamos uma instância válida
    if (!this._funcionalidadeService) {
      this._funcionalidadeService = new FuncionalidadeService();
    }
    return this._funcionalidadeService;
  }
  private dashboardReportService = DashboardReportService.getInstance();
  private _relatoriosReportService?: any; // Lazy initialization para evitar dependência circular
  
  private get relatoriosReportService() {
    // Lazy initialization: importação dinâmica para evitar dependência circular
    if (!this._relatoriosReportService) {
      try {
        const { RelatoriosReportService } = require('./services/relatorios-report-service');
        this._relatoriosReportService = RelatoriosReportService.getInstance();
      } catch (error) {
        throw error;
      }
    }
    return this._relatoriosReportService;
  }

  // Método para inicializar collections automaticamente
  private async ensureCollectionsInitialized(): Promise<void> {
    try {
      await initializeAllCollections();
      } catch (error) {
        // Não lançar erro para não quebrar a aplicação
      }
  }

  private async ensureTiposEventoInitialized(userId: string): Promise<void> {
    if (!userId) {
      return;
    }

    try {
      const existentes = await this.tipoEventoRepo.findAll(userId);
      if (existentes.length === 0) {
        // Se estiver no cliente, usar API route para evitar problemas de RLS
        const isClient = typeof window !== 'undefined';
        
        if (isClient) {
          try {
            const response = await fetch('/api/init/tipos-evento', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              return; // Sucesso via API route
            } else {
              const errorData = await response.json();
              // Continuar para tentar método direto
            }
          } catch (apiError) {
            // Continuar para tentar método direto
          }
        }

        // Método direto (funciona para Firebase ou servidor Supabase)
        for (const tipo of DEFAULT_TIPOS_EVENTO) {
          await this.tipoEventoRepo.createTipoEvento(
            {
              nome: tipo.nome,
              descricao: tipo.descricao ?? '',
              ativo: true,
              dataCadastro: new Date()
            },
            userId
          );
        }
      }
    } catch (error: any) {
      // Se for erro de RLS do Supabase, tentar via API route como último recurso
      if (error?.message?.includes('row-level security policy') && typeof window !== 'undefined') {
        try {
          const response = await fetch('/api/init/tipos-evento', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            return; // Sucesso via API route
          }
        } catch (apiError) {
        }
      }
    }
  }

  // Inicializar Canais de Entrada padrão
  private async ensureCanaisEntradaInitialized(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const existentes = await this.canalEntradaRepo.findAll(userId);
      if (existentes.length === 0) {
        // Se estiver no cliente, usar API route para evitar problemas de RLS
        const isClient = typeof window !== 'undefined';
        
        if (isClient) {
          try {
            const response = await fetch('/api/init/canais-entrada', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              return; // Sucesso via API route
            } else {
              const errorData = await response.json();
              // Continuar para tentar método direto
            }
          } catch (apiError) {
            // Continuar para tentar método direto
          }
        }

        // Método direto (funciona para Firebase ou servidor Supabase)
        const defaults = [
          { nome: 'instagram', descricao: 'Origem: Instagram' },
          { nome: 'indicação', descricao: 'Origem: Indicação' },
          { nome: 'outros', descricao: 'Origem: Outros' }
        ];
        for (const item of defaults) {
          await this.canalEntradaRepo.createCanalEntrada(userId, {
            ...item,
            ativo: true,
            dataCadastro: new Date()
          });
        }
      }
    } catch (error: any) {
      // Se for erro de RLS do Supabase, tentar via API route como último recurso
      if (error?.message?.includes('row-level security policy') && typeof window !== 'undefined') {
        try {
          const response = await fetch('/api/init/canais-entrada', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            return; // Sucesso via API route
          }
        } catch (apiError) {
        }
      }
    }
  }

  // Inicializar Tipos de Serviço padrão
  private async ensureTiposServicoInitialized(userId: string): Promise<void> {
    if (!userId) return;
    try {
      const existentes = await this.tipoServicoRepo.findAll(userId);
      if (existentes.length === 0) {
        // Se estiver no cliente, usar API route para evitar problemas de RLS
        const isClient = typeof window !== 'undefined';
        
        if (isClient) {
          try {
            const response = await fetch('/api/init/tipos-servico', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              return; // Sucesso via API route
            } else {
              const errorData = await response.json();
              // Continuar para tentar método direto
            }
          } catch (apiError) {
            // Continuar para tentar método direto
          }
        }

        // Método direto (funciona para Firebase ou servidor Supabase)
        const defaults = [
          { nome: 'totem fotográfico', descricao: 'Serviço de totem fotográfico' },
          { nome: 'instaprint', descricao: 'Serviço de Instaprint' },
          { nome: 'outros', descricao: 'Outros serviços' }
        ];
        for (const item of defaults) {
          await this.tipoServicoRepo.createTipoServico(
            { ...item, ativo: true },
            userId
          );
        }
      }
    } catch (error: any) {
      // Se for erro de RLS do Supabase, tentar via API route como último recurso
      if (error?.message?.includes('row-level security policy') && typeof window !== 'undefined') {
        try {
          const response = await fetch('/api/init/tipos-servico', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (response.ok) {
            return; // Sucesso via API route
          }
        } catch (apiError) {
        }
      }
    }
  }

  // Métodos para Clientes
  async getClientes(userId: string): Promise<Cliente[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar clientes');
    }
    // Retornar apenas clientes não arquivados por padrão
    return this.clienteRepo.getAtivos(userId);
  }
  
  async getAllClientes(userId: string): Promise<Cliente[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar clientes');
    }
    // Retornar todos os clientes (incluindo arquivados) - usado em relatórios
    return this.clienteRepo.findAll(userId);
  }

  async getClienteById(id: string, userId: string): Promise<Cliente | null> {
    return this.clienteRepo.getClienteById(id, userId);
  }

  async createCliente(
    cliente: Omit<Cliente, 'id' | 'dataCadastro'>,
    userId: string,
    skipPlanValidation: boolean = false
  ): Promise<Cliente> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar cliente');
    }

    // Validar permissão e limite antes de criar (a menos que seja bypassado)
    if (!skipPlanValidation) {
      const validacao = await this.funcionalidadeService.verificarPodeCriar(userId, 'clientes');
      if (!validacao.pode) {
        const erro = new Error(validacao.motivo || 'Não é possível criar cliente');
        (erro as any).status = 403;
        (erro as any).limite = validacao.limite;
        (erro as any).usado = validacao.usado;
        (erro as any).restante = validacao.restante;
        throw erro;
      }
    }

    // Normalizar e validar email antes de criar
    if (cliente.email) {
      const emailNormalizado = cliente.email.toLowerCase().trim();
      
      // Verificar se já existe cliente com este email
      const clienteExistente = await this.clienteRepo.findByEmail(emailNormalizado, userId);
      if (clienteExistente) {
        const erro = new Error(`Já existe um cliente cadastrado com o email ${cliente.email}`);
        (erro as any).status = 409; // Conflict
        throw erro;
      }

      // Normalizar email no objeto antes de salvar
      cliente = {
        ...cliente,
        email: emailNormalizado
      };
    }

    return this.clienteRepo.createCliente(cliente, userId);
  }

  async updateCliente(id: string, cliente: Partial<Cliente>, userId: string): Promise<Cliente> {
    return this.clienteRepo.updateCliente(id, cliente, userId);
  }

  async deleteCliente(id: string, userId: string): Promise<void> {
    return this.clienteRepo.deleteCliente(id, userId);
  }
  
  async desarquivarCliente(id: string, userId: string): Promise<void> {
    return this.clienteRepo.desarquivarCliente(id, userId);
  }
  
  async getClientesArquivados(userId: string): Promise<Cliente[]> {
    return this.clienteRepo.getArquivados(userId);
  }

  async searchClientesByName(name: string, userId: string): Promise<Cliente[]> {
    return this.clienteRepo.searchByName(name, userId);
  }

  // Métodos para Eventos
  async getEventos(userId: string): Promise<Evento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar eventos');
    }
    // Retornar apenas eventos não arquivados por padrão
    return this.eventoRepo.getAtivos(userId);
  }
  
  async getAllEventos(userId: string): Promise<Evento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar eventos');
    }
    // Retornar todos os eventos (incluindo arquivados) - usado em relatórios
    return this.eventoRepo.findAll(userId);
  }

  async getEventoById(id: string, userId: string): Promise<Evento | null> {
    return this.eventoRepo.getEventoById(id, userId);
  }

  async createEvento(
    evento: Omit<Evento, 'id' | 'dataCadastro' | 'dataAtualizacao'>,
    userId: string,
    skipPlanValidation: boolean = false
  ): Promise<Evento> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar evento');
    }

    // Validar permissão e limite antes de criar (a menos que seja bypassado)
    if (!skipPlanValidation) {
      const validacao = await this.funcionalidadeService.verificarPodeCriar(userId, 'eventos');
      if (!validacao.pode) {
        const erro = new Error(validacao.motivo || 'Não é possível criar evento');
        (erro as any).status = 403;
        (erro as any).limite = validacao.limite;
        (erro as any).usado = validacao.usado;
        (erro as any).restante = validacao.restante;
        throw erro;
      }
    }

    try {
      const resultado = await this.eventoRepo.createEvento(evento, userId);
      // COMENTADO: Sincronização com Google Calendar desabilitada - Aguardando permissões diretas da Google
      /*
      // Sincronizar com Google Calendar apenas no servidor (não bloquear se falhar)
      // Usar eval para evitar que webpack analise a importação
      if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
        try {
          // Importação dinâmica que só funciona no servidor
          const syncModule = await Function('return import')()('./services/google-calendar-sync-service');
          syncModule.GoogleCalendarSyncService.syncAfterCreate(resultado, userId).catch(() => {});
        } catch (error) {
          // Ignorar erro silenciosamente (pode não estar disponível no cliente)
        }
      }
      */
      
      return resultado;
    } catch (error) {
      throw error;
    }
  }

  async updateEvento(id: string, evento: Partial<Evento>, userId: string): Promise<Evento> {
    // Buscar evento antigo para comparação
    const eventoAntigo = await this.eventoRepo.getEventoById(id, userId);
    
    // Atualizar evento
    const resultado = await this.eventoRepo.updateEvento(id, evento, userId);
    
    // Buscar evento atualizado completo (pode ter mudado durante a atualização)
    const eventoAtualizado = await this.eventoRepo.getEventoById(id, userId) || resultado;
    
    // COMENTADO: Sincronização com Google Calendar desabilitada - Aguardando permissões diretas da Google
    /*
    // Sincronizar com Google Calendar apenas no servidor (não bloquear se falhar)
    // Usar eval para evitar que webpack analise a importação
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
      try {
        // Importação dinâmica que só funciona no servidor
        const syncModule = await Function('return import')()('./services/google-calendar-sync-service');
        syncModule.GoogleCalendarSyncService.syncAfterUpdate(eventoAtualizado, userId, eventoAntigo).catch(() => {});
      } catch (error) {
        // Ignorar erro silenciosamente (pode não estar disponível no cliente)
      }
    }
    */
    
    return resultado;
  }

  async deleteEvento(id: string, userId: string): Promise<void> {
    // Buscar evento antes de arquivar para sincronização
    const evento = await this.eventoRepo.getEventoById(id, userId);
    
    await this.eventoRepo.deleteEvento(id, userId);
    
    // COMENTADO: Sincronização com Google Calendar desabilitada - Aguardando permissões diretas da Google
    /*
    // Sincronizar com Google Calendar apenas no servidor (não bloquear se falhar)
    // Usar eval para evitar que webpack analise a importação
    if (evento && typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
      try {
        // Importação dinâmica que só funciona no servidor
        const syncModule = await Function('return import')()('./services/google-calendar-sync-service');
        syncModule.GoogleCalendarSyncService.syncAfterDelete({ ...evento, arquivado: true }, userId).catch(() => {});
      } catch (error) {
        // Ignorar erro silenciosamente (pode não estar disponível no cliente)
      }
    }
    */
  }
  
  async desarquivarEvento(id: string, userId: string): Promise<void> {
    // Buscar evento antes de desarquivar para sincronização
    const eventoAntigo = await this.eventoRepo.getEventoById(id, userId);
    
    await this.eventoRepo.desarquivarEvento(id, userId);
    
    // Buscar evento atualizado após desarquivamento
    const eventoAtualizado = await this.eventoRepo.getEventoById(id, userId);
    
    // COMENTADO: Sincronização com Google Calendar desabilitada - Aguardando permissões diretas da Google
    /*
    // Sincronizar com Google Calendar apenas no servidor (não bloquear se falhar)
    // Usar eval para evitar que webpack analise a importação
    if (eventoAtualizado && typeof window === 'undefined' && typeof process !== 'undefined' && process.env) {
      try {
        // Importação dinâmica que só funciona no servidor
        const syncModule = await Function('return import')()('./services/google-calendar-sync-service');
        syncModule.GoogleCalendarSyncService.syncAfterUpdate(eventoAtualizado, userId, eventoAntigo).catch(() => {});
      } catch (error) {
        // Ignorar erro silenciosamente (pode não estar disponível no cliente)
      }
    }
    */
  }
  
  async getEventosArquivados(userId: string): Promise<Evento[]> {
    return this.eventoRepo.getArquivados(userId);
  }

  async getEventosHoje(userId: string): Promise<Evento[]> {
    return this.eventoRepo.getEventosHoje(userId);
  }

  async getProximosEventos(userId: string, limit?: number): Promise<Evento[]> {
    return this.eventoRepo.getProximosEventos(userId, limit);
  }

  async getEventosPorMes(mes: number, ano: number, userId: string): Promise<Evento[]> {
    return this.eventoRepo.getEventosPorMes(mes, ano, userId);
  }

  async getEventosPorStatus(status: string, userId: string): Promise<Evento[]> {
    return this.eventoRepo.findByStatus(status, userId);
  }

  async getEventosPorTipo(tipoEvento: string, userId: string): Promise<Evento[]> {
    return this.eventoRepo.findByTipoEvento(tipoEvento, userId);
  }

  async searchEventosByLocal(local: string, userId: string): Promise<Evento[]> {
    return this.eventoRepo.searchByLocal(local, userId);
  }

  async getEventosPorPeriodo(inicio: Date, fim: Date, userId: string): Promise<Evento[]> {
    return this.eventoRepo.getEventosPorPeriodo(inicio, fim, userId);
  }

  // Métodos para Pagamentos
  async getPagamentos(userId: string, eventoId: string): Promise<Pagamento[]> {
    return this.pagamentoRepo.findByEventoId(userId, eventoId);
  }

  async getPagamentoById(userId: string, eventoId: string, pagamentoId: string): Promise<Pagamento | null> {
    return this.pagamentoRepo.findById(pagamentoId, eventoId);
  }

  async createPagamento(userId: string, eventoId: string, pagamento: Omit<Pagamento, 'id'>): Promise<Pagamento> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar pagamento');
    }

    // Validar permissão para registrar pagamentos
    const temPermissao = await this.funcionalidadeService.verificarPermissao(userId, 'PAGAMENTOS_REGISTRAR');
    if (!temPermissao) {
      const erro = new Error('Seu plano não permite registrar pagamentos');
      (erro as any).status = 403;
      throw erro;
    }

    // Se estiver no cliente, usar API route para evitar problemas de RLS
    const isClient = typeof window !== 'undefined';
    
    if (isClient) {
      try {
        const response = await fetch('/api/pagamentos/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventoId,
            valor: pagamento.valor,
            dataPagamento: pagamento.dataPagamento instanceof Date 
              ? pagamento.dataPagamento.toISOString() 
              : pagamento.dataPagamento,
            formaPagamento: pagamento.formaPagamento,
            status: pagamento.status,
            observacoes: pagamento.observacoes,
            comprovante: pagamento.comprovante,
            anexoId: pagamento.anexoId,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar pagamento');
        }

        const data = await response.json();
        return {
          id: data.id,
          userId: data.userId,
          eventoId: data.eventoId,
          valor: data.valor,
          dataPagamento: new Date(data.dataPagamento),
          formaPagamento: data.formaPagamento,
          status: data.status,
          observacoes: data.observacoes,
          comprovante: data.comprovante,
          anexoId: data.anexoId,
          cancelado: data.cancelado || false,
          dataCancelamento: data.dataCancelamento ? new Date(data.dataCancelamento) : undefined,
          motivoCancelamento: data.motivoCancelamento,
          dataCadastro: new Date(data.dataCadastro),
          dataAtualizacao: new Date(data.dataAtualizacao),
        };
      } catch (apiError: any) {
        // Continuar para tentar método direto
      }
    }

    return this.pagamentoRepo.createPagamento(userId, eventoId, pagamento);
  }

  async updatePagamento(userId: string, eventoId: string, pagamentoId: string, pagamento: Partial<Pagamento>): Promise<Pagamento> {
    return this.pagamentoRepo.updatePagamento(userId, eventoId, pagamentoId, pagamento);
  }

  async deletePagamento(userId: string, eventoId: string, pagamentoId: string): Promise<void> {
    return this.pagamentoRepo.deletePagamento(userId, eventoId, pagamentoId);
  }

  async getPagamentosPorEvento(userId: string, eventoId: string): Promise<Pagamento[]> {
    return this.pagamentoRepo.findByEventoId(userId, eventoId);
  }

  async getPagamentosPorStatus(userId: string, eventoId: string, status: string): Promise<Pagamento[]> {
    return this.pagamentoRepo.findByStatus(userId, eventoId, status);
  }

  async getPagamentosPorForma(userId: string, eventoId: string, formaPagamento: string): Promise<Pagamento[]> {
    return this.pagamentoRepo.findByFormaPagamento(userId, eventoId, formaPagamento);
  }

  async getPagamentosPorMes(userId: string, eventoId: string, mes: number, ano: number): Promise<Pagamento[]> {
    return this.pagamentoRepo.getPagamentosPorMes(userId, eventoId, mes, ano);
  }

  async getTotalRecebidoPorPeriodo(userId: string, eventoId: string, inicio: Date, fim: Date): Promise<number> {
    return this.pagamentoRepo.getTotalRecebidoPorPeriodo(userId, eventoId, inicio, fim);
  }

  // Método para buscar todos os pagamentos de todos os eventos do usuário
  async getAllPagamentos(userId: string): Promise<Pagamento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar pagamentos');
    }
    
    try {
      // Buscar todos os pagamentos diretamente do repositório Supabase
      const todosPagamentos = await this.pagamentoRepo.findAll(userId);
      
      // Buscar todos os eventos do usuário para preencher informações do evento
      const eventos = await this.getAllEventos(userId);
      const eventosMap = new Map(eventos.map(evento => [evento.id, evento]));
      
      // Adicionar informações do evento a cada pagamento
      const pagamentosComEvento = todosPagamentos.map(pagamento => {
        const evento = pagamento.eventoId ? eventosMap.get(pagamento.eventoId) : null;
        
        return {
          ...pagamento,
          evento: evento ? {
            id: evento.id,
            nome: evento.cliente.nome, // Usar nome do cliente como identificador do evento
            dataEvento: evento.dataEvento,
            local: evento.local,
            cliente: evento.cliente
          } : undefined
        };
      });
      
      // Já vem ordenado por data de pagamento (mais recente primeiro) do repository
      return pagamentosComEvento;
    } catch (error) {
      return [];
    }
  }

  async getResumoFinanceiroPorEvento(userId: string, eventoId: string, valorTotalEvento: number, dataFinalPagamento?: Date): Promise<{
    totalPago: number;
    valorPendente: number;
    valorAtrasado: number;
    quantidadePagamentos: number;
    isAtrasado: boolean;
  }> {
    return this.pagamentoRepo.getResumoFinanceiroPorEvento(userId, eventoId, valorTotalEvento, dataFinalPagamento);
  }

  /**
   * Calcula resumo financeiro usando pagamentos já carregados (otimizado)
   * Usa a collection global de pagamentos para melhor performance
   */
  calcularResumoFinanceiroPorEvento(
    eventoId: string,
    valorTotalEvento: number,
    pagamentos: Pagamento[],
    dataFinalPagamento?: Date
  ): {
    totalPago: number;
    valorPendente: number;
    valorAtrasado: number;
    quantidadePagamentos: number;
    isAtrasado: boolean;
  } {
    // Filtrar pagamentos do evento usando dados já carregados
    const pagamentosEvento = pagamentos.filter(p => {
      const pEventoId = p.eventoId || (p as any).evento?.id;
      return pEventoId === eventoId && !p.cancelado;
    });
    
    // Filtrar pagamentos cancelados nos cálculos
    const totalPago = pagamentosEvento
      .filter(p => p.status === 'Pago')
      .reduce((total, p) => total + p.valor, 0);
    
    const valorPendente = valorTotalEvento - totalPago;
    const hoje = new Date();
    
    // Se não tem data final de pagamento, considera como pendente
    if (!dataFinalPagamento) {
      return {
        totalPago,
        valorPendente,
        valorAtrasado: 0,
        quantidadePagamentos: pagamentosEvento.length,
        isAtrasado: false
      };
    }
    
    const isAtrasado = hoje > dataFinalPagamento && valorPendente > 0;
    
    // Contar apenas pagamentos não cancelados
    const pagamentosAtivos = pagamentosEvento.filter(p => !p.cancelado);
    
    return {
      totalPago,
      valorPendente: isAtrasado ? 0 : valorPendente,
      valorAtrasado: isAtrasado ? valorPendente : 0,
      quantidadePagamentos: pagamentosAtivos.length,
      isAtrasado
    };
  }

  // Métodos para Tipos de Custo
  async getTiposCusto(userId: string): Promise<TipoCusto[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de custo');
    }
    try {
      // Garantir que os tipos de custo estejam inicializados
      await initializeTiposCusto(userId);
      
      // Buscar apenas tipos ativos por padrão
      return this.tipoCustoRepo.getAtivos(userId);
    } catch (error) {
      return [];
    }
  }

  async getTipoCustoById(id: string, userId: string): Promise<TipoCusto | null> {
    return this.tipoCustoRepo.getTipoCustoById(id, userId);
  }

  async createTipoCusto(tipoCusto: Omit<TipoCusto, 'id' | 'dataCadastro'>, userId: string): Promise<TipoCusto> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar tipo de custo');
    }

    // Se estiver no cliente, usar API route para evitar problemas de RLS
    const isClient = typeof window !== 'undefined';
    
    if (isClient) {
      try {
        const response = await fetch('/api/tipos-custo/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(tipoCusto),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar tipo de custo');
        }

        const data = await response.json();
        return {
          id: data.id,
          nome: data.nome,
          descricao: data.descricao || '',
          ativo: data.ativo,
          dataCadastro: new Date(data.dataCadastro),
        };
      } catch (apiError: any) {
        // Continuar para tentar método direto
      }
    }

    return this.tipoCustoRepo.createTipoCusto(tipoCusto, userId);
  }

  async updateTipoCusto(id: string, tipoCusto: Partial<TipoCusto>, userId: string): Promise<TipoCusto> {
    return this.tipoCustoRepo.updateTipoCusto(id, tipoCusto, userId);
  }

  async deleteTipoCusto(id: string, userId: string): Promise<void> {
    return this.tipoCustoRepo.deleteTipoCusto(id, userId);
  }
  
  async reativarTipoCusto(id: string, userId: string): Promise<void> {
    return this.tipoCustoRepo.reativarTipoCusto(id, userId);
  }
  
  async getTiposCustoAtivos(userId: string): Promise<TipoCusto[]> {
    return this.tipoCustoRepo.getAtivos(userId);
  }
  
  async getTiposCustoInativos(userId: string): Promise<TipoCusto[]> {
    return this.tipoCustoRepo.getInativos(userId);
  }

  // Métodos para Custos de Evento
  async getCustosEvento(userId: string, eventoId: string): Promise<CustoEvento[]> {
    return this.custoEventoRepo.findByEventoId(userId, eventoId);
  }

  async getCustoEventoById(userId: string, eventoId: string, custoId: string): Promise<CustoEvento | null> {
    return this.custoEventoRepo.findById(custoId, eventoId);
  }

  async createCustoEvento(userId: string, eventoId: string, custoEvento: Omit<CustoEvento, 'id'>): Promise<CustoEvento> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar custo');
    }

    // Se estiver no cliente, usar API route para evitar problemas de RLS
    const isClient = typeof window !== 'undefined';
    
    if (isClient) {
      try {
        const response = await fetch('/api/custos/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            eventoId,
            tipoCustoId: custoEvento.tipoCustoId,
            valor: custoEvento.valor,
            quantidade: custoEvento.quantidade,
            observacoes: custoEvento.observacoes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao criar custo');
        }

        const responseData = await response.json();
        const data = responseData.data ?? responseData;
        return {
          id: data.id,
          eventoId: data.eventoId,
          tipoCustoId: data.tipoCustoId,
          valor: data.valor,
          quantidade: data.quantidade,
          observacoes: data.observacoes,
          removido: data.removido || false,
          dataRemocao: data.dataRemocao ? new Date(data.dataRemocao) : undefined,
          motivoRemocao: data.motivoRemocao,
          dataCadastro: new Date(data.dataCadastro),
          tipoCusto: data.tipoCusto || {} as any,
          evento: data.evento || {} as any,
        };
      } catch (apiError: any) {
        // Continuar para tentar método direto
      }
    }

    return this.custoEventoRepo.createCustoEvento(userId, eventoId, custoEvento);
  }

  async updateCustoEvento(userId: string, eventoId: string, custoId: string, custoEvento: Partial<CustoEvento>): Promise<CustoEvento> {
    return this.custoEventoRepo.updateCustoEvento(userId, eventoId, custoId, custoEvento);
  }

  async deleteCustoEvento(userId: string, eventoId: string, custoId: string): Promise<void> {
    return this.custoEventoRepo.deleteCustoEvento(userId, eventoId, custoId);
  }

  async getCustosPorEvento(userId: string, eventoId: string): Promise<CustoEvento[]> {
    return this.custoEventoRepo.findByEventoId(userId, eventoId);
  }

  async getTotalCustosPorEvento(userId: string, eventoId: string): Promise<number> {
    return this.custoEventoRepo.getTotalCustosPorEvento(userId, eventoId);
  }

  async getResumoCustosPorEvento(userId: string, eventoId: string): Promise<ResumoCustosEvento> {
    return this.custoEventoRepo.getResumoCustosPorEvento(userId, eventoId);
  }

  // Método para buscar todos os custos de todos os eventos do usuário
  async getAllCustos(userId: string): Promise<CustoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar custos');
    }
    
    try {
      // Buscar todos os custos diretamente do repositório Supabase
      const todosCustos = await this.custoEventoRepo.findAll(userId);
      
      // Buscar todos os tipos de custo uma vez e criar um Map para lookup eficiente
      const tiposCusto = await this.getTiposCusto(userId);
      const tiposMap = new Map(tiposCusto.map(tipo => [tipo.id, tipo]));
      
      // Enriquecer custos com dados de TipoCusto
      const custosComTipo = todosCustos.map(custo => {
        const tipoCusto = tiposMap.get(custo.tipoCustoId) || {
          id: custo.tipoCustoId,
          nome: 'Tipo não encontrado',
          descricao: '',
          ativo: false,
          dataCadastro: new Date()
        } as TipoCusto;
        
        return {
          ...custo,
          tipoCusto
        };
      });
      
      // Já vem ordenado por data de cadastro (mais recente primeiro) do repository
      return custosComTipo;
    } catch (error) {
      return [];
    }
  }

  // Métodos para Tipos de Serviço
  async getTiposServico(userId: string): Promise<TipoServico[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de serviço');
    }
    try {
      await this.ensureCollectionsInitialized();
      await this.ensureTiposServicoInitialized(userId);
      // Buscar apenas tipos ativos por padrão
      return this.tipoServicoRepo.getAtivos(userId);
    } catch (error) {
      throw error;
    }
  }
  
  async getAllTiposServico(userId: string): Promise<TipoServico[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de serviço');
    }
    try {
      await this.ensureCollectionsInitialized();
      await this.ensureTiposServicoInitialized(userId);
      // Retornar todos (incluindo inativos) - usado em relatórios
      return this.tipoServicoRepo.findAll(userId);
    } catch (error) {
      throw error;
    }
  }

  async getTipoServicoById(id: string, userId: string): Promise<TipoServico | null> {
    return this.tipoServicoRepo.getTipoServicoById(id, userId);
  }

  async createTipoServico(tipoServico: Omit<TipoServico, 'id' | 'dataCadastro'>, userId: string): Promise<TipoServico> {
    return this.tipoServicoRepo.createTipoServico(tipoServico, userId);
  }

  async updateTipoServico(id: string, tipoServico: Partial<TipoServico>, userId: string): Promise<TipoServico> {
    return this.tipoServicoRepo.updateTipoServico(id, tipoServico, userId);
  }

  async deleteTipoServico(id: string, userId: string): Promise<void> {
    return this.tipoServicoRepo.deleteTipoServico(id, userId);
  }
  
  async reativarTipoServico(id: string, userId: string): Promise<void> {
    return this.tipoServicoRepo.reativarTipoServico(id, userId);
  }
  
  async getTiposServicoInativos(userId: string): Promise<TipoServico[]> {
    return this.tipoServicoRepo.getInativos(userId);
  }

  async getTiposServicoAtivos(userId: string): Promise<TipoServico[]> {
    await this.ensureTiposServicoInitialized(userId);
    return this.tipoServicoRepo.getAtivos(userId);
  }

  // Métodos para Serviços de Evento
  async getServicosEvento(userId: string, eventoId: string): Promise<ServicoEvento[]> {
    return this.servicoEventoRepo.findByEventoId(userId, eventoId);
  }

  async getServicoEventoById(userId: string, eventoId: string, servicoId: string): Promise<ServicoEvento | null> {
    return this.servicoEventoRepo.findById(servicoId, eventoId);
  }

  async createServicoEvento(userId: string, eventoId: string, servicoEvento: Omit<ServicoEvento, 'id'>): Promise<ServicoEvento> {
    // Não valida permissão aqui, pois este método apenas associa serviços existentes a um evento
    // A validação de permissão deve estar apenas em createTipoServico (criar novo tipo de serviço)
    // Se o usuário pode criar o evento, pode associar serviços existentes a ele
    return this.servicoEventoRepo.createServicoEvento(userId, eventoId, servicoEvento);
  }

  async updateServicoEvento(userId: string, eventoId: string, servicoId: string, servicoEvento: Partial<ServicoEvento>): Promise<ServicoEvento> {
    return this.servicoEventoRepo.updateServicoEvento(userId, eventoId, servicoId, servicoEvento);
  }

  async deleteServicoEvento(userId: string, eventoId: string, servicoId: string): Promise<void> {
    return this.servicoEventoRepo.deleteServicoEvento(userId, eventoId, servicoId);
  }

  async getServicosPorEvento(userId: string, eventoId: string): Promise<ServicoEvento[]> {
    return this.servicoEventoRepo.findByEventoId(userId, eventoId);
  }

  async getResumoServicosPorEvento(userId: string, eventoId: string): Promise<ResumoServicosEvento> {
    return this.servicoEventoRepo.getResumoServicosPorEvento(userId, eventoId);
  }

  /**
   * Busca serviços de múltiplos eventos de uma vez (otimização para listagens)
   * Retorna um mapa de eventoId -> ServicoEvento[] para acesso rápido
   */
  async getServicosPorEventos(userId: string, eventoIds: string[]): Promise<Map<string, ServicoEvento[]>> {
    return this.servicoEventoRepo.findByEventoIds(userId, eventoIds);
  }

  // Métodos para Dashboard
  async getDashboardData(userId: string, options?: { forceRefresh?: boolean }): Promise<DashboardData> {
    return this.dashboardReportService.getDashboardData(userId, options);
  }

  // Métodos para Relatórios
  async gerarTodosRelatorios(userId: string, options?: { forceRefresh?: boolean }): Promise<void> {
    return this.relatoriosReportService.gerarTodosRelatorios(userId, options);
  }

  async getRelatorioCacheado(
    userId: string,
    tipoRelatorio: 'detalhamentoReceber' | 'receitaMensal' | 'performanceEventos' | 'fluxoCaixa' | 'servicos' | 'canaisEntrada' | 'impressoes'
  ) {
    return this.relatoriosReportService.getRelatorioCacheado(userId, tipoRelatorio);
  }

  // Métodos para Canais de Entrada
  async getCanaisEntrada(userId: string): Promise<CanalEntrada[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar canais de entrada');
    }
    try {
      await this.ensureCanaisEntradaInitialized(userId);
      return await this.canalEntradaRepo.findAll(userId);
    } catch (error) {
      return [];
    }
  }

  async getCanaisEntradaAtivos(userId: string): Promise<CanalEntrada[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar canais de entrada ativos');
    }
    await this.ensureCanaisEntradaInitialized(userId);
    return this.canalEntradaRepo.getAtivos(userId);
  }

  async getCanalEntradaById(id: string, userId: string): Promise<CanalEntrada | null> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para buscar canal de entrada');
    }
    return this.canalEntradaRepo.getCanalEntradaById(userId, id);
  }

  async createCanalEntrada(canal: Omit<CanalEntrada, 'id'>, userId: string): Promise<CanalEntrada> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar canal de entrada');
    }

    // Validar se usuário tem plano ativo - usar validação de funcionalidade genérica
    // Como não existe funcionalidade específica para canais de entrada, verificamos se tem plano ativo
    const statusPlano = await this.funcionalidadeService.obterStatusAssinatura(userId);
    if (!statusPlano.ativo) {
      const erro = new Error('Seu plano não permite gerenciar canais de entrada');
      (erro as any).status = 403;
      throw erro;
    }

    return this.canalEntradaRepo.createCanalEntrada(userId, canal);
  }

  async updateCanalEntrada(id: string, canal: Partial<CanalEntrada>, userId: string): Promise<CanalEntrada> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para atualizar canal de entrada');
    }
    return this.canalEntradaRepo.updateCanalEntrada(userId, id, canal);
  }

  async deleteCanalEntrada(id: string, userId: string): Promise<void> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para deletar canal de entrada');
    }
    return this.canalEntradaRepo.deleteCanalEntrada(userId, id);
  }
  
  async reativarCanalEntrada(id: string, userId: string): Promise<void> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para reativar canal de entrada');
    }
    return this.canalEntradaRepo.reativarCanalEntrada(userId, id);
  }
  
  async getCanaisEntradaInativos(userId: string): Promise<CanalEntrada[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar canais de entrada inativos');
    }
    return this.canalEntradaRepo.getInativos(userId);
  }

  async searchCanaisEntrada(searchTerm: string, userId: string): Promise<CanalEntrada[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar canais de entrada');
    }
    return this.canalEntradaRepo.searchByName(userId, searchTerm);
  }

  // Métodos para Tipos de Evento
  async getTiposEvento(userId: string): Promise<TipoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de evento');
    }
    await this.ensureTiposEventoInitialized(userId);
    const tipos = await this.tipoEventoRepo.findAll(userId);
    return tipos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async getTiposEventoAtivos(userId: string): Promise<TipoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de evento');
    }
    await this.ensureTiposEventoInitialized(userId);
    const tipos = await this.tipoEventoRepo.getAtivos(userId);
    return tipos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  async getTipoEventoById(id: string, userId: string): Promise<TipoEvento | null> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para buscar tipo de evento');
    }
    return this.tipoEventoRepo.getTipoEventoById(id, userId);
  }

  async createTipoEvento(tipoEvento: Omit<TipoEvento, 'id' | 'dataCadastro'>, userId: string): Promise<TipoEvento> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar tipo de evento');
    }

    // Validar se usuário tem plano ativo - usar validação de funcionalidade genérica
    // Como não existe funcionalidade específica para tipos de evento, verificamos se tem plano ativo
    const statusPlano = await this.funcionalidadeService.obterStatusAssinatura(userId);
    if (!statusPlano.ativo) {
      const erro = new Error('Seu plano não permite gerenciar tipos de evento');
      (erro as any).status = 403;
      throw erro;
    }

    return this.tipoEventoRepo.createTipoEvento(
      {
        ...tipoEvento,
        dataCadastro: new Date()
      },
      userId
    );
  }

  async updateTipoEvento(id: string, tipoEvento: Partial<TipoEvento>, userId: string): Promise<TipoEvento> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para atualizar tipo de evento');
    }
    return this.tipoEventoRepo.updateTipoEvento(id, tipoEvento, userId);
  }

  async deleteTipoEvento(id: string, userId: string): Promise<void> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para deletar tipo de evento');
    }
    return this.tipoEventoRepo.deleteTipoEvento(id, userId);
  }
  
  async reativarTipoEvento(id: string, userId: string): Promise<void> {
    if (!id || !userId) {
      throw new Error('id e userId são obrigatórios para reativar tipo de evento');
    }
    return this.tipoEventoRepo.reativarTipoEvento(id, userId);
  }
  
  async getTiposEventoInativos(userId: string): Promise<TipoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de evento inativos');
    }
    await this.ensureTiposEventoInitialized(userId);
    const tipos = await this.tipoEventoRepo.getInativos(userId);
    return tipos.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }

  // Métodos para serviços
  async getAllServicos(userId: string): Promise<ServicoEvento[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar serviços');
    }
    
    try {
      // Buscar todos os serviços diretamente do repositório Supabase
      // O findAll já retorna com tipo_servicos populado
      const todosServicos = await this.servicoEventoRepo.findAll(userId);
      
      // Já vem ordenado por data de cadastro (mais recente primeiro) do repository
      return todosServicos;
    } catch (error) {
      return [];
    }
  }

  async getTiposServicos(userId: string): Promise<TipoServico[]> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar tipos de serviços');
    }
    return this.tipoServicoRepo.findAll(userId);
  }
}

export const dataService = new DataService();
