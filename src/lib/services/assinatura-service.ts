import { repositoryFactory } from '../repositories/repository-factory';
import { Assinatura, StatusAssinatura, Plano } from '@/types/funcionalidades';
import { User, UserAssinatura } from '@/types';

interface AssinaturaRepositoryPort {
  findByUserId(userId: string): Promise<Assinatura | null>;
  findById(id: string): Promise<Assinatura | null>;
  findAllByUserId(userId: string): Promise<Assinatura[]>;
  create(data: Omit<Assinatura, 'id'>): Promise<Assinatura>;
  update(id: string, data: Partial<Assinatura>): Promise<Assinatura>;
  addHistorico(id: string, item: any): Promise<any>;
  atualizarStatus(id: string, status: StatusAssinatura, dadosAdicionais?: Partial<Assinatura>): Promise<Assinatura>;
}

interface PlanoRepositoryPort {
  findByCodigoHotmart(codigo: string): Promise<Plano | null>;
  findAtivos(): Promise<Plano[]>;
  findById(id: string): Promise<Plano | null>;
}

interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
}

export interface PlanoStatus {
  plano: Plano | null;
  assinatura: Assinatura | null;
  status: StatusAssinatura | 'sem_assinatura';
  pagamentoEmDia: boolean;
  ativo: boolean;
  mensagem?: string;
}

export class AssinaturaService {
  private assinaturaRepo: AssinaturaRepositoryPort;
  private planoRepo: PlanoRepositoryPort;
  private userRepo: UserRepositoryPort;

  constructor(
    assinaturaRepo?: AssinaturaRepositoryPort,
    planoRepo?: PlanoRepositoryPort,
    userRepo?: UserRepositoryPort
  ) {
    // Resolver dependências pelo composition root (factory), sem acoplar a classes concretas
    this.assinaturaRepo = assinaturaRepo || (repositoryFactory.getAssinaturaRepository() as unknown as AssinaturaRepositoryPort);
    this.planoRepo = planoRepo || (repositoryFactory.getPlanoRepository() as unknown as PlanoRepositoryPort);
    this.userRepo = userRepo || (repositoryFactory.getUserRepository() as unknown as UserRepositoryPort);
  }

  /**
   * Obtém o plano padrão por perfil:
   * - admin -> PREMIUM_MENSAL
   * - user  -> BASICO_MENSAL
   */
  private async obterPlanoPadraoPorPerfil(user: User): Promise<Plano> {
    const codigoPlanoPadrao = user.role === 'admin' ? 'PREMIUM_MENSAL' : 'BASICO_MENSAL';
    const plano = await this.planoRepo.findByCodigoHotmart(codigoPlanoPadrao);

    if (!plano) {
      throw new Error(`Plano padrão ${codigoPlanoPadrao} não encontrado`);
    }

    return plano;
  }

  /**
   * Verifica se usuário tem assinatura ativa
   */
  async verificarAssinaturaAtiva(userId: string): Promise<boolean> {
    // Admin sempre tem acesso
    const user = await this.userRepo.findById(userId);
    if (user?.role === 'admin') {
      return true;
    }

    const assinatura = await this.assinaturaRepo.findByUserId(userId);
    if (!assinatura) {
      return false;
    }

    return assinatura.status === 'active' || assinatura.status === 'trial';
  }

  /**
   * Verifica se pagamento está em dia
   */
  async validarStatusPagamento(userId: string): Promise<boolean> {
    // Admin sempre tem pagamento em dia
    const user = await this.userRepo.findById(userId);
    if (user?.role === 'admin') {
      return true;
    }

    const assinatura = await this.assinaturaRepo.findByUserId(userId);
    if (!assinatura) {
      return false;
    }

    // Verificar se assinatura está ativa
    if (assinatura.status !== 'active' && assinatura.status !== 'trial') {
      return false;
    }

    // Verificar data de expiração
    if (assinatura.dataFim) {
      const agora = new Date();
      if (assinatura.dataFim < agora) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtém status completo do plano do usuário
   */
  async obterStatusPlanoUsuario(userId: string): Promise<PlanoStatus> {
    // Admin sempre tem acesso total
    const user = await this.userRepo.findById(userId);
    if (user?.role === 'admin') {
      // Buscar primeiro plano como referência (para admin)
      const planos = await this.planoRepo.findAtivos();
      const planoAdmin = planos.length > 0 ? planos[0] : null;
      
      return {
        plano: planoAdmin,
        assinatura: null,
        status: 'active',
        pagamentoEmDia: true,
        ativo: true,
        mensagem: 'Admin - acesso total'
      };
    }

    const assinatura = await this.assinaturaRepo.findByUserId(userId);
    
    if (!assinatura) {
      return {
        plano: null,
        assinatura: null,
        status: 'sem_assinatura',
        pagamentoEmDia: false,
        ativo: false,
        mensagem: 'Usuário não possui assinatura ativa'
      };
    }

    let plano: Plano | null = null;
    if (assinatura.planoId) {
      plano = await this.planoRepo.findById(assinatura.planoId);
    }

    const pagamentoEmDia = await this.validarStatusPagamento(userId);
    const ativo = assinatura.status === 'active' || assinatura.status === 'trial';

    let mensagem: string | undefined;
    if (!ativo) {
      mensagem = `Assinatura ${assinatura.status.toLowerCase()}`;
    } else if (!pagamentoEmDia) {
      mensagem = 'Pagamento em atraso';
    }

    return {
      plano,
      assinatura,
      status: assinatura.status,
      pagamentoEmDia,
      ativo,
      mensagem
    };
  }

  /**
   * Atualiza assinatura do usuário
   */
  async atualizarAssinaturaUsuario(userId: string, assinaturaId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const assinatura = await this.assinaturaRepo.findById(assinaturaId);
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    if (assinatura.userId !== userId) {
      throw new Error('Assinatura não pertence ao usuário');
    }

    // Sincronizar dados do plano no usuário
    return this.sincronizarPlanoUsuario(userId);
  }

  /**
   * Sincroniza dados do plano no usuário (atualiza cache)
   */
  async sincronizarPlanoUsuario(userId: string): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Admin não precisa de sincronização
    if (user.role === 'admin') {
      return user;
    }

    // Buscar assinatura ativa primeiro; se não houver, buscar a mais recente (qualquer status)
    let assinatura = await this.assinaturaRepo.findByUserId(userId);
    if (!assinatura) {
      const todas = await this.assinaturaRepo.findAllByUserId(userId);
      assinatura = todas.length > 0 ? todas[0] : null;
    }
    
    // Se não houver nenhuma assinatura, limpar o objeto assinatura
    if (!assinatura) {
      const dadosAtualizacao: Partial<User> = {
        assinatura: undefined,
        dataAtualizacao: new Date()
      };
      return await this.userRepo.update(userId, dadosAtualizacao);
    }

    // Buscar plano
    let plano: Plano | null = null;
    if (assinatura.planoId) {
      plano = await this.planoRepo.findById(assinatura.planoId);
    }

    // Calcular status de pagamento
    const pagamentoEmDia = await this.validarStatusPagamento(userId);
    const ativo = assinatura.status === 'active' || assinatura.status === 'trial';

    // Mapear status da assinatura para o formato do User
    let statusUser: 'ATIVA' | 'TRIAL' | 'CANCELADA' | 'EXPIRADA' | 'SUSPENSA' | undefined;
    if (assinatura.status === 'active') statusUser = 'ATIVA';
    else if (assinatura.status === 'trial') statusUser = 'TRIAL';
    else if (assinatura.status === 'cancelled') statusUser = 'CANCELADA';
    else if (assinatura.status === 'expired') statusUser = 'EXPIRADA';
    else if (assinatura.status === 'suspended') statusUser = 'SUSPENSA';

    // Construir objeto assinatura consolidado
    // IMPORTANTE: Não incluir campos undefined para evitar erros no Firestore
    const assinaturaUser: any = {
      ultimaSincronizacao: new Date()
    };
    
    // Adicionar campos apenas se tiverem valor válido (evitar undefined)
    if (assinatura.id) assinaturaUser.id = assinatura.id;
    if (plano?.id) assinaturaUser.planoId = plano.id;
    if (plano?.nome) assinaturaUser.planoNome = plano.nome;
    if (plano?.codigoHotmart) assinaturaUser.planoCodigoHotmart = plano.codigoHotmart;
    if (assinatura.funcionalidadesHabilitadas && assinatura.funcionalidadesHabilitadas.length > 0) {
      assinaturaUser.funcionalidadesHabilitadas = assinatura.funcionalidadesHabilitadas;
    }
    if (statusUser) assinaturaUser.status = statusUser;
    if (pagamentoEmDia !== undefined) assinaturaUser.pagamentoEmDia = pagamentoEmDia;
    if (assinatura.dataFim) assinaturaUser.dataExpira = assinatura.dataFim;
    if (assinatura.dataRenovacao) assinaturaUser.dataProximoPagamento = assinatura.dataRenovacao;

    // Preparar dados para atualização
    const dadosAtualizacao: Partial<User> = {
      assinatura: assinaturaUser,
      dataAtualizacao: new Date()
    };

    // Atualizar usuário com dados da assinatura
    const userAtualizado = await this.userRepo.update(userId, dadosAtualizacao);

    return userAtualizado;
  }

  /**
   * Criar assinatura para usuário
   */
  async criarAssinaturaUsuario(
    userId: string,
    planoId: string,
    status: StatusAssinatura = 'trial',
    hotmartSubscriptionId?: string
  ): Promise<Assinatura> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const plano = await this.planoRepo.findById(planoId);
    if (!plano) {
      throw new Error('Plano não encontrado');
    }

    // Verificar se usuário já tem assinatura ativa
    const assinaturaExistente = await this.assinaturaRepo.findByUserId(userId);
    if (assinaturaExistente && (assinaturaExistente.status === 'active' || assinaturaExistente.status === 'trial')) {
      throw new Error('Usuário já possui assinatura ativa');
    }

    // Calcular datas
    const agora = new Date();
    let dataFim: Date | undefined;
    let dataRenovacao: Date | undefined;

    if (status === 'trial') {
      // Trial de 7 dias
      dataFim = new Date(agora);
      dataFim.setDate(dataFim.getDate() + 7);
    } else if (status === 'active') {
      // Assinatura mensal (30 dias)
      dataRenovacao = new Date(agora);
      dataRenovacao.setMonth(dataRenovacao.getMonth() + 1);
    }

    // Criar assinatura
    const assinatura = await this.assinaturaRepo.create({
      userId,
      planoId: plano.id,
      status,
      hotmartSubscriptionId: hotmartSubscriptionId || `LOCAL_${userId}_${Date.now()}`,
      dataInicio: agora,
      dataFim,
      dataRenovacao,
      funcionalidadesHabilitadas: plano.funcionalidades || [],
      historico: [{
        data: agora,
        acao: 'Assinatura criada',
        detalhes: { plano: plano.nome, status }
      }],
      dataCadastro: agora,
      dataAtualizacao: agora
    });

    // Sincronizar plano no usuário
    await this.sincronizarPlanoUsuario(userId);

    return assinatura;
  }

  /**
   * Define ou troca o plano de um usuário via operação administrativa interna.
   * Não depende de webhooks externos (Hotmart).
   */
  async definirPlanoUsuario(
    userId: string,
    planoId: string,
    status: StatusAssinatura = 'active',
    detalhesHistorico?: Record<string, any>
  ): Promise<{ assinatura: Assinatura; user: User }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const plano = await this.planoRepo.findById(planoId);
    if (!plano) {
      throw new Error('Plano não encontrado');
    }

    const agora = new Date();
    let assinatura = await this.assinaturaRepo.findByUserId(userId);
    if (!assinatura) {
      const historico = [{
        data: agora,
        acao: `Assinatura criada via painel admin - Plano: ${plano.nome}`,
        detalhes: {
          planoId: plano.id,
          planoNome: plano.nome,
          status,
          ...detalhesHistorico
        }
      }];

      assinatura = await this.assinaturaRepo.create({
        userId,
        planoId: plano.id,
        hotmartSubscriptionId: `CRM_${userId}_${agora.getTime()}`,
        status,
        dataInicio: agora,
        dataFim: status === 'trial' ? new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined,
        dataRenovacao: status === 'active' ? new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined,
        funcionalidadesHabilitadas: plano.funcionalidades || [],
        historico,
        dataCadastro: agora,
        dataAtualizacao: agora
      });
    } else {
      await this.assinaturaRepo.addHistorico(assinatura.id, {
        data: agora,
        acao: `Plano alterado via painel admin para ${plano.nome}`,
        detalhes: {
          planoAnteriorId: assinatura.planoId || null,
          planoNovoId: plano.id,
          planoNovoNome: plano.nome,
          statusNovo: status,
          ...detalhesHistorico
        }
      });

      assinatura = await this.assinaturaRepo.update(assinatura.id, {
        ...assinatura,
        planoId: plano.id,
        status,
        funcionalidadesHabilitadas: plano.funcionalidades || [],
        dataAtualizacao: agora,
        ...(status === 'trial'
          ? { dataFim: new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000), dataRenovacao: undefined }
          : status === 'active'
            ? { dataFim: undefined, dataRenovacao: new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000) }
            : {})
      });
    }

    const userAtualizado = await this.sincronizarPlanoUsuario(userId);
    return { assinatura, user: userAtualizado };
  }

  /**
   * Atualiza somente o status da assinatura atual do usuário.
   */
  async atualizarStatusAssinaturaUsuario(
    userId: string,
    status: StatusAssinatura,
    detalhesHistorico?: Record<string, any>
  ): Promise<{ assinatura: Assinatura; user: User }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    let assinatura = await this.assinaturaRepo.findByUserId(userId);
    if (!assinatura) {
      const todas = await this.assinaturaRepo.findAllByUserId(userId);
      assinatura = todas.length > 0 ? todas[0] : null;
    }

    if (!assinatura) {
      const agora = new Date();
      const dataFim = status === 'trial' ? new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000) : undefined;
      const dataRenovacao = status === 'active' ? new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000) : undefined;
      const planoPadrao = await this.obterPlanoPadraoPorPerfil(user);

      assinatura = await this.assinaturaRepo.create({
        userId,
        planoId: planoPadrao.id,
        hotmartSubscriptionId: `CRM_STATUS_${userId}_${agora.getTime()}`,
        status,
        dataInicio: agora,
        dataFim,
        dataRenovacao,
        funcionalidadesHabilitadas: planoPadrao.funcionalidades || [],
        historico: [{
          data: agora,
          acao: `Assinatura criada automaticamente via atualização de status (${status})`,
          detalhes: {
            planoId: planoPadrao.id,
            planoCodigo: planoPadrao.codigoHotmart,
            planoNome: planoPadrao.nome,
            ...(detalhesHistorico || { origem: 'admin_manual' })
          }
        }],
        dataCadastro: agora,
        dataAtualizacao: agora
      });
    }

    const agora = new Date();
    const dadosAdicionais: Partial<Assinatura> = {
      dataAtualizacao: agora
    };

    // Ativar novamente deve restaurar funcionalidades do plano atual, se existir.
    if (status === 'active' || status === 'trial') {
      let plano = assinatura.planoId ? await this.planoRepo.findById(assinatura.planoId) : null;
      if (!plano) {
        // Assinaturas antigas sem plano passam a receber o plano padrão do perfil.
        plano = await this.obterPlanoPadraoPorPerfil(user);
        dadosAdicionais.planoId = plano.id;
      }
      if (plano) {
        dadosAdicionais.funcionalidadesHabilitadas = plano.funcionalidades || [];
      }
      if (status === 'trial') {
        dadosAdicionais.dataFim = new Date(agora.getTime() + 7 * 24 * 60 * 60 * 1000);
        dadosAdicionais.dataRenovacao = undefined;
      } else {
        dadosAdicionais.dataFim = undefined;
        dadosAdicionais.dataRenovacao = new Date(agora.getTime() + 30 * 24 * 60 * 60 * 1000);
      }
    }

    if (status === 'suspended' || status === 'expired') {
      dadosAdicionais.funcionalidadesHabilitadas = [];
    }

    assinatura = await this.assinaturaRepo.atualizarStatus(assinatura.id, status, dadosAdicionais);

    if (detalhesHistorico) {
      await this.assinaturaRepo.addHistorico(assinatura.id, {
        data: agora,
        acao: `Status atualizado via painel admin para ${status}`,
        detalhes: detalhesHistorico
      });
    }

    const userAtualizado = await this.sincronizarPlanoUsuario(userId);
    return { assinatura, user: userAtualizado };
  }
}

