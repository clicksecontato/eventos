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

  private toTimestamp(value: unknown): number {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value).getTime();
      return Number.isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private ordenarMaisRecente(a: Assinatura, b: Assinatura): number {
    const dataA = Math.max(
      this.toTimestamp(a.dataInicio),
      this.toTimestamp(a.dataAtualizacao),
      this.toTimestamp(a.dataCadastro)
    );
    const dataB = Math.max(
      this.toTimestamp(b.dataInicio),
      this.toTimestamp(b.dataAtualizacao),
      this.toTimestamp(b.dataCadastro)
    );
    return dataB - dataA;
  }

  async findByUserId(userId: string): Promise<Assinatura | null> {
    const assinaturas = await this.findWhere('userId', '==', userId);
    // Buscar a assinatura ativa mais recente
    const ativas = assinaturas
      .filter(a => a.status === 'trial' || a.status === 'active')
      .sort((a, b) => this.ordenarMaisRecente(a, b));
    
    return ativas.length > 0 ? ativas[0] : null;
  }

  async findByHotmartId(hotmartId: string): Promise<Assinatura | null> {
    const assinaturas = await this.findWhere('hotmartSubscriptionId', '==', hotmartId);
    return assinaturas.length > 0 ? assinaturas[0] : null;
  }

  async findAllByUserId(userId: string): Promise<Assinatura[]> {
    const assinaturas = await this.findWhere('userId', '==', userId);
    return assinaturas.sort((a, b) => this.ordenarMaisRecente(a, b));
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

export default AdminAssinaturaRepository;

