import { AdminFirestoreRepository } from './admin-firestore-repository';
import { Assinatura, StatusAssinatura, EventoHistoricoAssinatura } from '@/types/funcionalidades';

/**
 * Repository de assinaturas usando Firebase Admin SDK
 * Bypassa as regras de segurança do Firestore (usado apenas no servidor)
 */
export class AdminAssinaturaRepository extends AdminFirestoreRepository<Assinatura> {
  constructor() {
    super('assinaturas');
  }

  async findByUserId(userId: string): Promise<Assinatura | null> {
    const assinaturas = await this.findWhere('userId', '==', userId);
    // Buscar a assinatura ativa mais recente
    const ativas = assinaturas
      .filter(a => (a.status === 'trial' || a.status === 'active') && a.dataInicio)
      .sort((a, b) => {
        const dataA = a.dataInicio instanceof Date ? a.dataInicio.getTime() : new Date(a.dataInicio || 0).getTime();
        const dataB = b.dataInicio instanceof Date ? b.dataInicio.getTime() : new Date(b.dataInicio || 0).getTime();
        return dataB - dataA;
      });
    
    return ativas.length > 0 ? ativas[0] : null;
  }

  async findByHotmartId(hotmartId: string): Promise<Assinatura | null> {
    const assinaturas = await this.findWhere('hotmartSubscriptionId', '==', hotmartId);
    return assinaturas.length > 0 ? assinaturas[0] : null;
  }

  async findAllByUserId(userId: string): Promise<Assinatura[]> {
    const assinaturas = await this.findWhere('userId', '==', userId);
    return assinaturas.sort((a, b) => {
      const dataA = a.dataInicio instanceof Date ? a.dataInicio.getTime() : new Date(a.dataInicio || 0).getTime();
      const dataB = b.dataInicio instanceof Date ? b.dataInicio.getTime() : new Date(b.dataInicio || 0).getTime();
      return dataB - dataA;
    });
  }

  async findAtivas(): Promise<Assinatura[]> {
    const assinaturas = await this.findAll();
    return assinaturas.filter(a => a.status === 'active' || a.status === 'trial');
  }

  async addHistorico(id: string, evento: EventoHistoricoAssinatura): Promise<Assinatura> {
    const assinatura = await this.findById(id);
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    const historico = [...(assinatura.historico || []), evento];
    return this.update(id, {
      ...assinatura,
      historico,
      dataAtualizacao: new Date()
    });
  }

  async atualizarStatus(id: string, status: StatusAssinatura, dadosAdicionais?: Partial<Assinatura>): Promise<Assinatura> {
    const assinatura = await this.findById(id);
    if (!assinatura) {
      throw new Error('Assinatura não encontrada');
    }

    // Adicionar evento ao histórico
    await this.addHistorico(id, {
      data: new Date(),
      acao: `Status alterado para ${status}`,
      detalhes: { statusAnterior: assinatura.status, statusNovo: status }
    });

    // Buscar assinatura atualizada (com histórico atualizado) para preservar o histórico
    const assinaturaAtualizada = await this.findById(id);
    if (!assinaturaAtualizada) {
      throw new Error('Assinatura não encontrada após atualização do histórico');
    }

    // Atualizar status e outros campos, preservando o histórico atualizado
    return this.update(id, {
      ...assinaturaAtualizada,
      status,
      ...dadosAdicionais,
      dataAtualizacao: new Date()
    });
  }
}

