import { AdminFirestoreRepository } from './admin-firestore-repository';
import { Plano } from '@/types/funcionalidades';

/**
 * Repository de planos usando Firebase Admin SDK
 * Bypassa as regras de segurança do Firestore (usado apenas no servidor)
 */
export class AdminPlanoRepository extends AdminFirestoreRepository<Plano> {
  constructor() {
    super('planos');
  }

  async findByCodigoHotmart(codigo: string): Promise<Plano | null> {
    const planos = await this.findWhere('codigoHotmart', '==', codigo);
    return planos.length > 0 ? planos[0] : null;
  }

  async findAtivos(): Promise<Plano[]> {
    return this.findWhere('ativo', '==', true);
  }

  async findDestaque(): Promise<Plano[]> {
    const planos = await this.findWhere('destaque', '==', true);
    return planos.filter(p => p.ativo);
  }

  async findPorIntervalo(intervalo: 'mensal' | 'anual'): Promise<Plano[]> {
    const planos = await this.findWhere('intervalo', '==', intervalo);
    return planos.filter(p => p.ativo);
  }
}

