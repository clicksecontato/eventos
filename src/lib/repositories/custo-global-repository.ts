import { CustoEvento } from '@/types';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  setDoc,
  query, 
  where, 
  orderBy,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '../firestore/collections';

/**
 * Repository para a collection global de custos
 * Estrutura: users/{userId}/custos/{custoId}{eventoId}
 * 
 * Esta collection é usada para consultas rápidas de todos os custos,
 * especialmente para relatórios e análises gerais.
 */
export class CustoGlobalRepository {
  /**
   * Obtém a referência da collection de custos globais do usuário
   */
  private getCustosGlobalCollection(userId: string) {
    if (!userId) {
      throw new Error('userId é obrigatório para acessar custos globais');
    }
    return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CUSTOS);
  }

  /**
   * Gera o ID do documento na collection global
   * Formato: {custoId}{eventoId}
   */
  private generateDocumentId(custoId: string, eventoId: string): string {
    return `${custoId}${eventoId}`;
  }

  /**
   * Converte dados do Firestore para CustoEvento
   */
  private convertFirestoreData(data: any, id: string): CustoEvento {
    const converted = { ...data, id } as any;
    
    // Converter Timestamps para Date
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });
    
    return converted as CustoEvento;
  }

  /**
   * Converte CustoEvento para formato do Firestore
   */
  private convertToFirestoreData(custo: Partial<CustoEvento>): any {
    const converted = { ...custo } as any;
    
    // Remover campos undefined e converter Dates para Timestamps
    Object.keys(converted).forEach(key => {
      if (converted[key] === undefined) {
        delete converted[key];
      } else if (converted[key] instanceof Date) {
        converted[key] = Timestamp.fromDate(converted[key] as Date);
      }
    });
    
    return converted;
  }

  /**
   * Cria um custo na collection global
   */
  async createCusto(userId: string, eventoId: string, custoId: string, custo: Omit<CustoEvento, 'id' | 'evento' | 'tipoCusto'>): Promise<CustoEvento> {
    const custosCollection = this.getCustosGlobalCollection(userId);
    const documentId = this.generateDocumentId(custoId, eventoId);
    
    // Remover campos undefined antes de enviar para o Firestore
    const cleanData = { ...custo } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    // Garantir que eventoId e custoId estão presentes
    // Preservar dataCadastro original se existir, senão usar data atual
    const custoData = {
      ...cleanData,
      eventoId,
      custoId, // Armazenar o custoId original para facilitar recuperação
      dataCadastro: custo.dataCadastro || new Date()
    };
    
    const docRef = doc(custosCollection, documentId);
    // Usar setDoc com merge para criar ou atualizar
    await setDoc(docRef, this.convertToFirestoreData(custoData), { merge: true });
    
    return {
      id: custoId,
      ...custo,
      eventoId,
      dataCadastro: new Date()
    } as CustoEvento;
  }

  /**
   * Atualiza um custo na collection global
   */
  async updateCusto(userId: string, eventoId: string, custoId: string, custo: Partial<Omit<CustoEvento, 'id' | 'evento' | 'tipoCusto'>>): Promise<CustoEvento> {
    const custosCollection = this.getCustosGlobalCollection(userId);
    const documentId = this.generateDocumentId(custoId, eventoId);
    const custoRef = doc(custosCollection, documentId);
    
    // Remover campos undefined antes de enviar para o Firestore
    const cleanData = { ...custo } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    await updateDoc(custoRef, this.convertToFirestoreData(cleanData));
    
    const updatedDoc = await getDoc(custoRef);
    if (!updatedDoc.exists()) {
      throw new Error('Custo não encontrado após atualização');
    }
    
    const data = updatedDoc.data();
    return this.convertFirestoreData({ ...data, custoId }, custoId);
  }

  /**
   * Marca um custo como removido na collection global
   */
  async deleteCusto(userId: string, eventoId: string, custoId: string): Promise<void> {
    const custosCollection = this.getCustosGlobalCollection(userId);
    const documentId = this.generateDocumentId(custoId, eventoId);
    const custoRef = doc(custosCollection, documentId);
    
    await updateDoc(custoRef, {
      removido: true,
      dataRemocao: Timestamp.now()
    });
  }

  /**
   * Busca todos os custos de um usuário
   */
  async findAll(userId: string): Promise<CustoEvento[]> {
    const custosCollection = this.getCustosGlobalCollection(userId);
    const q = query(custosCollection, orderBy('dataCadastro', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const custoId = data.custoId || doc.id;
      return this.convertFirestoreData({ ...data, custoId }, custoId);
    });
  }

  /**
   * Busca custos por evento
   */
  async findByEventoId(userId: string, eventoId: string): Promise<CustoEvento[]> {
    const custosCollection = this.getCustosGlobalCollection(userId);
    const q = query(
      custosCollection, 
      where('eventoId', '==', eventoId),
      orderBy('dataCadastro', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const custoId = data.custoId || doc.id;
      return this.convertFirestoreData({ ...data, custoId }, custoId);
    });
  }

  /**
   * Busca um custo específico
   */
  async findById(userId: string, eventoId: string, custoId: string): Promise<CustoEvento | null> {
    const custosCollection = this.getCustosGlobalCollection(userId);
    const documentId = this.generateDocumentId(custoId, eventoId);
    const custoRef = doc(custosCollection, documentId);
    const docSnap = await getDoc(custoRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return this.convertFirestoreData({ ...data, custoId }, custoId);
  }
}

