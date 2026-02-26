import { AdminFirestoreRepository } from './admin-firestore-repository';
import { Funcionalidade, CategoriaFuncionalidade } from '@/types/funcionalidades';

/**
 * Repository de funcionalidades usando Firebase Admin SDK
 * Bypassa as regras de segurança do Firestore (usado apenas no servidor)
 */
export class AdminFuncionalidadeRepository extends AdminFirestoreRepository<Funcionalidade> {
  constructor() {
    super('funcionalidades');
  }

  async findByCodigo(codigo: string): Promise<Funcionalidade | null> {
    const funcionalidades = await this.findWhere('codigo', '==', codigo);
    return funcionalidades.length > 0 ? funcionalidades[0] : null;
  }

  async findByCategoria(categoria: CategoriaFuncionalidade): Promise<Funcionalidade[]> {
    return this.findWhere('categoria', '==', categoria);
  }

  async findAtivas(): Promise<Funcionalidade[]> {
    const funcionalidades = await this.findWhere('ativo', '==', true);
    return funcionalidades.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria);
      }
      return (a.ordem || 0) - (b.ordem || 0);
    });
  }

  async findAllOrdered(): Promise<Funcionalidade[]> {
    const funcionalidades = await this.findAll();
    return funcionalidades.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria);
      }
      return (a.ordem || 0) - (b.ordem || 0);
    });
  }
}
