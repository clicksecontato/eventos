import { AssinaturaRepository } from '../repositories/assinatura-repository';
import { AdminAssinaturaRepository } from '../repositories/admin-assinatura-repository';
import { PlanoRepository } from '../repositories/plano-repository';
import { AdminPlanoRepository } from '../repositories/admin-plano-repository';
import { UserRepository } from '../repositories/user-repository';
import { AdminUserRepository } from '../repositories/admin-user-repository';
import { Assinatura, StatusAssinatura, Plano } from '@/types/funcionalidades';
import { User, UserAssinatura } from '@/types';

export interface PlanoStatus {
  plano: Plano | null;
  assinatura: Assinatura | null;
  status: StatusAssinatura | 'sem_assinatura';
  pagamentoEmDia: boolean;
  ativo: boolean;
  mensagem?: string;
}

export class AssinaturaService {
  private assinaturaRepo: AssinaturaRepository | AdminAssinaturaRepository;
  private planoRepo: PlanoRepository | AdminPlanoRepository;
  private userRepo: UserRepository | AdminUserRepository;

  constructor(
    assinaturaRepo?: AssinaturaRepository | AdminAssinaturaRepository,
    planoRepo?: PlanoRepository | AdminPlanoRepository,
    userRepo?: UserRepository | AdminUserRepository
  ) {
    // Manter compatibilidade: se não passar dependências, criar novas instâncias
    this.assinaturaRepo = assinaturaRepo || new AssinaturaRepository();
    this.planoRepo = planoRepo || new PlanoRepository();
    this.userRepo = userRepo || new UserRepository();
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
}

