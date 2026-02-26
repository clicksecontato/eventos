import { Pagamento } from '@/types';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
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
 * Repository para a collection global de pagamentos
 * Estrutura: users/{userId}/pagamentos/{pagamentoId}{eventoId}
 * 
 * Esta collection é usada para consultas rápidas de todos os pagamentos,
 * especialmente para relatórios e análises gerais.
 */
export class PagamentoGlobalRepository {
  /**
   * Obtém a referência da collection de pagamentos globais do usuário
   */
  private getPagamentosGlobalCollection(userId: string) {
    if (!userId) {
      throw new Error('userId é obrigatório para acessar pagamentos globais');
    }
    return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.PAGAMENTOS);
  }

  /**
   * Gera o ID do documento na collection global
   * Formato: {pagamentoId}{eventoId}
   */
  private generateDocumentId(pagamentoId: string, eventoId: string): string {
    return `${pagamentoId}${eventoId}`;
  }

  /**
   * Extrai pagamentoId e eventoId do ID do documento
   */
  private parseDocumentId(documentId: string): { pagamentoId: string; eventoId: string } | null {
    // O ID é composto por pagamentoId + eventoId
    // Precisamos encontrar onde termina o pagamentoId e começa o eventoId
    // Como não temos um separador fixo, vamos usar uma estratégia diferente:
    // Vamos armazenar o eventoId como um campo separado no documento
    // Mas manter o ID como {pagamentoId}{eventoId} para facilitar buscas
    return null; // Não vamos usar parse, vamos armazenar eventoId no documento
  }

  /**
   * Converte dados do Firestore para Pagamento
   */
  private convertFirestoreData(data: any, id: string): Pagamento {
    const converted = { ...data, id } as any;
    
    // Converter Timestamps para Date
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });
    
    return converted as Pagamento;
  }

  /**
   * Converte Pagamento para formato do Firestore
   */
  private convertToFirestoreData(pagamento: Partial<Pagamento>): any {
    const converted = { ...pagamento } as any;
    
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
   * Cria um pagamento na collection global
   */
  async createPagamento(userId: string, eventoId: string, pagamentoId: string, pagamento: Omit<Pagamento, 'id'>): Promise<Pagamento> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const documentId = this.generateDocumentId(pagamentoId, eventoId);
    
    // Remover campos undefined antes de enviar para o Firestore
    const cleanData = { ...pagamento } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    // Garantir que eventoId, userId e pagamentoId estão presentes
    const pagamentoData = {
      ...cleanData,
      userId,
      eventoId,
      pagamentoId, // Armazenar o pagamentoId original para facilitar recuperação
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    };
    
    const docRef = doc(pagamentosCollection, documentId);
    // Usar setDoc com merge para criar ou atualizar
    await setDoc(docRef, this.convertToFirestoreData(pagamentoData), { merge: true });
    
    return {
      id: pagamentoId,
      ...pagamento,
      userId,
      eventoId,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Pagamento;
  }

  /**
   * Atualiza um pagamento na collection global
   */
  async updatePagamento(userId: string, eventoId: string, pagamentoId: string, pagamento: Partial<Pagamento>): Promise<Pagamento> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const documentId = this.generateDocumentId(pagamentoId, eventoId);
    const pagamentoRef = doc(pagamentosCollection, documentId);
    
    // Remover campos undefined antes de enviar para o Firestore
    const cleanData = { ...pagamento } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    await updateDoc(pagamentoRef, {
      ...this.convertToFirestoreData(cleanData),
      dataAtualizacao: Timestamp.now()
    });
    
    const updatedDoc = await getDoc(pagamentoRef);
    if (!updatedDoc.exists()) {
      throw new Error('Pagamento não encontrado após atualização');
    }
    
    return this.convertFirestoreData(updatedDoc.data(), pagamentoId);
  }

  /**
   * Exclui um pagamento da collection global
   */
  async deletePagamento(userId: string, eventoId: string, pagamentoId: string): Promise<void> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const documentId = this.generateDocumentId(pagamentoId, eventoId);
    const pagamentoRef = doc(pagamentosCollection, documentId);
    
    await deleteDoc(pagamentoRef);
  }

  /**
   * Busca todos os pagamentos de um usuário
   */
  async findAll(userId: string): Promise<Pagamento[]> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const q = query(pagamentosCollection, orderBy('dataPagamento', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Usar pagamentoId armazenado no documento
      const pagamentoId = data.pagamentoId || doc.id;
      
      return this.convertFirestoreData({ ...data, pagamentoId }, pagamentoId);
    });
  }

  /**
   * Busca pagamentos por evento
   */
  async findByEventoId(userId: string, eventoId: string): Promise<Pagamento[]> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const q = query(
      pagamentosCollection, 
      where('eventoId', '==', eventoId),
      orderBy('dataPagamento', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const pagamentoId = data.pagamentoId || doc.id;
      return this.convertFirestoreData({ ...data, pagamentoId }, pagamentoId);
    });
  }

  /**
   * Busca pagamentos por status
   */
  async findByStatus(userId: string, status: string): Promise<Pagamento[]> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const q = query(
      pagamentosCollection, 
      where('status', '==', status),
      orderBy('dataPagamento', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const pagamentoId = data.pagamentoId || doc.id;
      return this.convertFirestoreData({ ...data, pagamentoId }, pagamentoId);
    });
  }

  /**
   * Busca um pagamento específico
   */
  async findById(userId: string, eventoId: string, pagamentoId: string): Promise<Pagamento | null> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const documentId = this.generateDocumentId(pagamentoId, eventoId);
    const pagamentoRef = doc(pagamentosCollection, documentId);
    const docSnap = await getDoc(pagamentoRef);
    
    if (!docSnap.exists()) {
      return null;
    }
    
    const data = docSnap.data();
    return this.convertFirestoreData({ ...data, pagamentoId }, pagamentoId);
  }

  /**
   * Busca pagamentos por período
   */
  async findByDataPagamento(userId: string, dataInicio: Date, dataFim: Date): Promise<Pagamento[]> {
    const pagamentosCollection = this.getPagamentosGlobalCollection(userId);
    const q = query(
      pagamentosCollection,
      where('dataPagamento', '>=', Timestamp.fromDate(dataInicio)),
      where('dataPagamento', '<=', Timestamp.fromDate(dataFim)),
      orderBy('dataPagamento', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const pagamentoId = data.pagamentoId || doc.id;
      return this.convertFirestoreData({ ...data, pagamentoId }, pagamentoId);
    });
  }
}

