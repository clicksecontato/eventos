import { ServicoEvento } from '@/types';
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

export class ServicoGlobalRepository {
  private getServicosGlobalCollection(userId: string) {
    if (!userId) {
      throw new Error('userId é obrigatório para acessar serviços globais');
    }
    return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.SERVICOS_EVENTO);
  }

  private generateDocumentId(servicoId: string, eventoId: string): string {
    return `${servicoId}${eventoId}`;
  }

  private convertFirestoreData(data: any, id: string): ServicoEvento {
    const converted = { ...data, id } as any;
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });
    return converted as ServicoEvento;
  }

  private convertToFirestoreData(servico: Partial<ServicoEvento>): any {
    const converted = { ...servico } as any;
    Object.keys(converted).forEach(key => {
      if (converted[key] === undefined) {
        delete converted[key];
      } else if (converted[key] instanceof Date) {
        converted[key] = Timestamp.fromDate(converted[key] as Date);
      }
    });
    return converted;
  }

  async createServico(userId: string, eventoId: string, servicoId: string, servico: Omit<ServicoEvento, 'id' | 'tipoServico'>): Promise<ServicoEvento> {
    const servicosCollection = this.getServicosGlobalCollection(userId);
    const documentId = this.generateDocumentId(servicoId, eventoId);

    const cleanData = { ...servico } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    const servicoData = {
      ...cleanData,
      userId,
      eventoId,
      servicoId,
      dataCadastro: new Date(),
    };

    const docRef = doc(servicosCollection, documentId);
    await setDoc(docRef, this.convertToFirestoreData(servicoData), { merge: true });

    return {
      id: servicoId,
      ...servico,
      eventoId,
      dataCadastro: new Date(),
    } as ServicoEvento;
  }

  async updateServico(userId: string, eventoId: string, servicoId: string, servico: Partial<Omit<ServicoEvento, 'id' | 'tipoServico'>>): Promise<ServicoEvento> {
    const servicosCollection = this.getServicosGlobalCollection(userId);
    const documentId = this.generateDocumentId(servicoId, eventoId);
    const servicoRef = doc(servicosCollection, documentId);

    const cleanData = { ...servico } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });

    await updateDoc(servicoRef, {
      ...this.convertToFirestoreData(cleanData),
    });

    const updatedDoc = await getDoc(servicoRef);
    if (!updatedDoc.exists()) {
      throw new Error('Serviço não encontrado após atualização');
    }

    return this.convertFirestoreData(updatedDoc.data(), servicoId);
  }

  async deleteServico(userId: string, eventoId: string, servicoId: string): Promise<void> {
    const servicosCollection = this.getServicosGlobalCollection(userId);
    const documentId = this.generateDocumentId(servicoId, eventoId);
    const servicoRef = doc(servicosCollection, documentId);

    await updateDoc(servicoRef, {
      removido: true,
      dataRemocao: Timestamp.now(),
    });
  }

  async findAll(userId: string): Promise<ServicoEvento[]> {
    const servicosCollection = this.getServicosGlobalCollection(userId);
    const q = query(servicosCollection, orderBy('dataCadastro', 'desc'));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const servicoId = data.servicoId || doc.id;
      return this.convertFirestoreData({ ...data, servicoId }, servicoId);
    });
  }

  async findByEventoId(userId: string, eventoId: string): Promise<ServicoEvento[]> {
    const servicosCollection = this.getServicosGlobalCollection(userId);
    const q = query(
      servicosCollection,
      where('eventoId', '==', eventoId),
      orderBy('dataCadastro', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      const servicoId = data.servicoId || doc.id;
      return this.convertFirestoreData({ ...data, servicoId }, servicoId);
    });
  }

  async findById(userId: string, eventoId: string, servicoId: string): Promise<ServicoEvento | null> {
    const servicosCollection = this.getServicosGlobalCollection(userId);
    const documentId = this.generateDocumentId(servicoId, eventoId);
    const servicoRef = doc(servicosCollection, documentId);
    const docSnap = await getDoc(servicoRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return this.convertFirestoreData({ ...data, servicoId }, servicoId);
  }
}

