import { SubcollectionRepository } from './subcollection-repository';
import { TipoEvento } from '@/types';
import { COLLECTIONS } from '../firestore/collections';
import { addDoc, deleteDoc, getDoc, getDocs, limit, query, updateDoc } from 'firebase/firestore';

export class TipoEventoRepository extends SubcollectionRepository<TipoEvento> {
  constructor() {
    super(COLLECTIONS.USERS, COLLECTIONS.TIPO_EVENTOS);
  }

  private async ensureSubcollectionExists(userId: string): Promise<void> {
    try {
      const testQuery = query(this.getSubcollectionRef(userId), limit(1));
      await getDocs(testQuery);
    } catch (error) {
      const tempDoc = {
        nome: '_temp_init',
        descricao: 'Documento temporário para inicializar subcollection',
        ativo: false,
        dataCadastro: new Date()
      };

      try {
        const docRef = await addDoc(this.getSubcollectionRef(userId), tempDoc);
        await deleteDoc(docRef);
      } catch (createError) {
        throw createError;
      }
    }
  }

  async findByNome(nome: string, userId: string): Promise<TipoEvento | null> {
    await this.ensureSubcollectionExists(userId);
    const tipos = await this.findWhere('nome', '==', nome, userId);
    return tipos.length > 0 ? tipos[0] : null;
  }

  async getAtivos(userId: string): Promise<TipoEvento[]> {
    await this.ensureSubcollectionExists(userId);
    return this.findWhere('ativo', '==', true, userId);
  }

  async searchByName(name: string, userId: string): Promise<TipoEvento[]> {
    await this.ensureSubcollectionExists(userId);
    const allTipos = await this.findAll(userId);
    return allTipos.filter(tipo =>
      tipo.nome.toLowerCase().includes(name.toLowerCase()) ||
      (tipo.descricao || '').toLowerCase().includes(name.toLowerCase())
    );
  }

  async createTipoEvento(tipoEvento: Omit<TipoEvento, 'id'>, userId: string): Promise<TipoEvento> {
    await this.ensureSubcollectionExists(userId);
    const tipoWithMeta = {
      ...tipoEvento,
      dataCadastro: new Date()
    } as Omit<TipoEvento, 'id'>;

    return this.create(tipoWithMeta, userId);
  }

  async updateTipoEvento(id: string, tipoEvento: Partial<TipoEvento>, userId: string): Promise<TipoEvento> {
    await this.ensureSubcollectionExists(userId);

    const updateData = this.convertToFirestoreData(tipoEvento) as any;
    const docRef = this.getSubcollectionDocRef(userId, id);
    await updateDoc(docRef, updateData);

    const updatedDoc = await getDoc(docRef);
    if (!updatedDoc.exists()) {
      throw new Error('Document not found after update');
    }

    return this.convertFirestoreData(updatedDoc.data(), id);
  }

  async deleteTipoEvento(id: string, userId: string): Promise<void> {
    await this.ensureSubcollectionExists(userId);
    // Inativação ao invés de exclusão física
    await this.update(id, { ativo: false }, userId);
  }
  
  async reativarTipoEvento(id: string, userId: string): Promise<void> {
    await this.ensureSubcollectionExists(userId);
    await this.update(id, { ativo: true }, userId);
  }
  
  async getInativos(userId: string): Promise<TipoEvento[]> {
    await this.ensureSubcollectionExists(userId);
    return this.findWhere('ativo', '==', false, userId);
  }

  async getTipoEventoById(id: string, userId: string): Promise<TipoEvento | null> {
    await this.ensureSubcollectionExists(userId);
    return this.findById(id, userId);
  }
}

