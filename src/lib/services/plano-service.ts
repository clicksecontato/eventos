import { PlanoRepository } from '../repositories/plano-repository';
import { AdminPlanoRepository } from '../repositories/admin-plano-repository';
import { FuncionalidadeRepository } from '../repositories/funcionalidade-repository';
import { AssinaturaRepository } from '../repositories/assinatura-repository';
import { AdminAssinaturaRepository } from '../repositories/admin-assinatura-repository';
import { UserRepository } from '../repositories/user-repository';
import { AdminUserRepository } from '../repositories/admin-user-repository';
import { AssinaturaService } from './assinatura-service';
import { Plano, PlanoComFuncionalidades, StatusAssinatura } from '@/types/funcionalidades';

export class PlanoService {
  private planoRepo: PlanoRepository | AdminPlanoRepository;
  private funcionalidadeRepo: FuncionalidadeRepository;
  private assinaturaRepo: AssinaturaRepository | AdminAssinaturaRepository;
  private userRepo: UserRepository | AdminUserRepository;
  private assinaturaService: AssinaturaService;

  constructor(
    planoRepo?: PlanoRepository | AdminPlanoRepository,
    funcionalidadeRepo?: FuncionalidadeRepository,
    assinaturaRepo?: AssinaturaRepository | AdminAssinaturaRepository,
    userRepo?: UserRepository | AdminUserRepository,
    assinaturaService?: AssinaturaService
  ) {
    // Manter compatibilidade: se não passar dependências, criar novas instâncias
    this.planoRepo = planoRepo || new PlanoRepository();
    this.funcionalidadeRepo = funcionalidadeRepo || new FuncionalidadeRepository();
    this.assinaturaRepo = assinaturaRepo || new AssinaturaRepository();
    this.userRepo = userRepo || new UserRepository();
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

