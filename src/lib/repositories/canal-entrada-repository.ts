import { SubcollectionRepository } from './subcollection-repository';
import { CanalEntrada } from '@/types';
import { COLLECTIONS } from '../firestore/collections';

export class CanalEntradaRepository extends SubcollectionRepository<CanalEntrada> {
  constructor() {
    super(COLLECTIONS.USERS, COLLECTIONS.CANAIS_ENTRADA);
  }

  // Método para garantir que a subcollection existe
  // No Firestore, a subcollection é criada automaticamente ao adicionar o primeiro documento
  // Este método apenas verifica acessibilidade sem criar documentos automaticamente
  private async ensureSubcollectionExists(userId: string): Promise<void> {
    // No Firestore, subcollections são criadas automaticamente ao adicionar o primeiro documento
    // Não precisamos fazer nada aqui, apenas manter o método para compatibilidade
    // O método create() da classe base já lida com a criação automática da subcollection
  }

  async findByNome(userId: string, nome: string): Promise<CanalEntrada | null> {
    await this.ensureSubcollectionExists(userId);
    const canais = await this.findWhere('nome', '==', nome, userId);
    return canais.length > 0 ? canais[0] : null;
  }

  async getAtivos(userId: string): Promise<CanalEntrada[]> {
    try {
      // Usar o método da classe base que já está otimizado
      return await super.getAtivos(userId);
    } catch (error) {
      console.error('Erro ao buscar canais de entrada ativos:', error);
      // Retornar array vazio em caso de erro para não quebrar a interface
      return [];
    }
  }

  async searchByName(userId: string, searchTerm: string): Promise<CanalEntrada[]> {
    await this.ensureSubcollectionExists(userId);
    const allCanais = await this.findAll(userId);
    return allCanais.filter(canal =>
      canal.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  async createCanalEntrada(userId: string, canal: Omit<CanalEntrada, 'id'>): Promise<CanalEntrada> {
    // No Firestore, a subcollection é criada automaticamente ao adicionar o primeiro documento
    // Não é necessário chamar ensureSubcollectionExists antes de criar
    return super.create(canal, userId);
  }

  async updateCanalEntrada(userId: string, canalId: string, canal: Partial<CanalEntrada>): Promise<CanalEntrada> {
    await this.ensureSubcollectionExists(userId);
    return super.update(canalId, canal, userId);
  }

  async deleteCanalEntrada(userId: string, canalId: string): Promise<void> {
    await this.ensureSubcollectionExists(userId);
    // Inativação ao invés de exclusão física
    await super.update(canalId, { ativo: false }, userId);
  }
  
  async reativarCanalEntrada(userId: string, canalId: string): Promise<void> {
    await this.ensureSubcollectionExists(userId);
    await super.update(canalId, { ativo: true }, userId);
  }
  
  async getInativos(userId: string): Promise<CanalEntrada[]> {
    await this.ensureSubcollectionExists(userId);
    return this.findWhere('ativo', '==', false, userId);
  }

  async getCanalEntradaById(userId: string, canalId: string): Promise<CanalEntrada | null> {
    await this.ensureSubcollectionExists(userId);
    return super.findById(canalId, userId);
  }
}
