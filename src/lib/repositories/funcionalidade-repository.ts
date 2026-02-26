import { FirestoreRepository } from './firestore-repository';
import { Funcionalidade, CategoriaFuncionalidade } from '@/types/funcionalidades';
import { where, orderBy } from 'firebase/firestore';

export class FuncionalidadeRepository extends FirestoreRepository<Funcionalidade> {
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
    return this.query([where('ativo', '==', true), orderBy('ordem', 'asc')]);
  }

  async findAllOrdered(): Promise<Funcionalidade[]> {
    const funcionalidades = await this.findAll();
    return funcionalidades.sort((a, b) => {
      if (a.categoria !== b.categoria) {
        return a.categoria.localeCompare(b.categoria);
      }
      return a.ordem - b.ordem;
    });
  }
}

