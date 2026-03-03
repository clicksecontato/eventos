import { repositoryFactory } from '../repositories/repository-factory';
import { AssinaturaService } from './assinatura-service';
import { Assinatura, Funcionalidade, Plano, PlanoComFuncionalidades, StatusAssinatura } from '@/types/funcionalidades';
import { User } from '@/types';

interface PlanoRepositoryPort {
  findAtivos(): Promise<Plano[]>;
  findById(id: string): Promise<Plano | null>;
  findDestaque(): Promise<Plano[]>;
}

interface FuncionalidadeRepositoryPort {
  findById(id: string): Promise<Funcionalidade | null>;
}

interface AssinaturaRepositoryPort {
  findByHotmartId(hotmartSubscriptionId: string): Promise<Assinatura | null>;
  update(id: string, data: Partial<Assinatura>): Promise<Assinatura>;
  create(data: Omit<Assinatura, 'id'>): Promise<Assinatura>;
  findByUserId(userId: string): Promise<Assinatura | null>;
}

interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
}

export class PlanoService {
  private planoRepo: PlanoRepositoryPort;
  private funcionalidadeRepo: FuncionalidadeRepositoryPort;
  private assinaturaRepo: AssinaturaRepositoryPort;
  private userRepo: UserRepositoryPort;
  private assinaturaService: AssinaturaService;

  constructor(
    planoRepo?: PlanoRepositoryPort,
    funcionalidadeRepo?: FuncionalidadeRepositoryPort,
    assinaturaRepo?: AssinaturaRepositoryPort,
    userRepo?: UserRepositoryPort,
    assinaturaService?: AssinaturaService
  ) {
    // Resolver dependências pelo composition root (factory), sem acoplar a classes concretas
    this.planoRepo = planoRepo || (repositoryFactory.getPlanoRepository() as unknown as PlanoRepositoryPort);
    this.funcionalidadeRepo = funcionalidadeRepo || (repositoryFactory.getFuncionalidadeRepository() as unknown as FuncionalidadeRepositoryPort);
    this.assinaturaRepo = assinaturaRepo || (repositoryFactory.getAssinaturaRepository() as unknown as AssinaturaRepositoryPort);
    this.userRepo = userRepo || (repositoryFactory.getUserRepository() as unknown as UserRepositoryPort);
    this.assinaturaService = assinaturaService || new AssinaturaService();
  }

  async obterTodosPlanos(): Promise<Plano[]> {
    return this.planoRepo.findAtivos();
  }

  async obterPlanoComFuncionalidades(planoId: string): Promise<PlanoComFuncionalidades | null> {
    const plano = await this.planoRepo.findById(planoId);
    if (!plano) return null;

    const funcionalidadesDetalhes = [];
    for (const funcId of plano.funcionalidades) {
      const func = await this.funcionalidadeRepo.findById(funcId);
      if (func) {
        funcionalidadesDetalhes.push(func);
      }
    }

    return {
      ...plano,
      funcionalidadesDetalhes
    };
  }

  async obterPlanosDestaque(): Promise<Plano[]> {
    return this.planoRepo.findDestaque();
  }

  async aplicarPlanoUsuario(userId: string, planoId: string, hotmartSubscriptionId: string, status: StatusAssinatura = 'trial'): Promise<void> {
    const plano = await this.planoRepo.findById(planoId);
    if (!plano) {
      throw new Error('Plano não encontrado');
    }

    // Buscar assinatura existente ou criar nova
    let assinatura = await this.assinaturaRepo.findByHotmartId(hotmartSubscriptionId);
    
    const dadosAssinatura = {
      userId,
      planoId: plano.id,
      hotmartSubscriptionId,
      status,
      dataInicio: new Date(),
      funcionalidadesHabilitadas: plano.funcionalidades,
      historico: [{
        data: new Date(),
        acao: `Assinatura criada - Plano: ${plano.nome}`,
        detalhes: { planoId: plano.id, status }
      }],
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    };

    if (assinatura) {
      // Atualizar assinatura existente
      await this.assinaturaRepo.update(assinatura.id, dadosAssinatura);
      assinatura = { ...assinatura, ...dadosAssinatura };
    } else {
      // Criar nova assinatura
      assinatura = await this.assinaturaRepo.create(dadosAssinatura);
    }

    // Sincronizar usando o serviço que já atualiza a estrutura consolidada
    await this.assinaturaService.sincronizarPlanoUsuario(userId);
  }

  async obterPlanoAtual(userId: string): Promise<Plano | null> {
    const assinatura = await this.assinaturaRepo.findByUserId(userId);
    if (!assinatura || !assinatura.planoId) {
      return null;
    }

    return this.planoRepo.findById(assinatura.planoId);
  }

  async compararPlanos(): Promise<PlanoComFuncionalidades[]> {
    const planos = await this.obterTodosPlanos();
    const planosComDetalhes: PlanoComFuncionalidades[] = [];

    for (const plano of planos) {
      const detalhes = await this.obterPlanoComFuncionalidades(plano.id);
      if (detalhes) {
        planosComDetalhes.push(detalhes);
      }
    }

    return planosComDetalhes;
  }

  private calcularDataFimTrial(): Date {
    const data = new Date();
    data.setDate(data.getDate() + 7); // 7 dias de trial
    return data;
  }
}

