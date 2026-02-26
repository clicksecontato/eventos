import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { COLLECTIONS } from '../firestore/collections';

export interface ArquivoEvento {
  id: string;
  userId: string;
  eventoId: string;
  nome: string;
  tipo: string;
  tamanho: number;
  s3Key: string;
  url: string;
  dataUpload: Date;
  dataCadastro: Date;
}

export class ArquivoRepository {
  private getArquivosCollection(userId: string, eventoId: string) {
    return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS, eventoId, COLLECTIONS.ANEXOS_EVENTOS);
  }

  async createArquivo(
    userId: string,
    eventoId: string,
    arquivo: Omit<ArquivoEvento, 'id' | 'dataCadastro'>
  ): Promise<ArquivoEvento> {
    const arquivosCollection = this.getArquivosCollection(userId, eventoId);
    
    const arquivoData = {
      ...arquivo,
      dataCadastro: new Date(),
    };

    const docRef = await addDoc(arquivosCollection, arquivoData);
    
    return {
      id: docRef.id,
      ...arquivoData,
    };
  }

  async getArquivosPorEvento(userId: string, eventoId: string): Promise<ArquivoEvento[]> {
    const arquivosCollection = this.getArquivosCollection(userId, eventoId);
    const q = query(arquivosCollection, orderBy('dataUpload', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dataUpload: data.dataUpload?.toDate ? data.dataUpload.toDate() : new Date(data.dataUpload),
        dataCadastro: data.dataCadastro?.toDate ? data.dataCadastro.toDate() : new Date(data.dataCadastro),
      } as ArquivoEvento;
    });
  }

  async deleteArquivo(userId: string, eventoId: string, arquivoId: string): Promise<void> {
    const arquivoDoc = doc(this.getArquivosCollection(userId, eventoId), arquivoId);
    await deleteDoc(arquivoDoc);
  }

  async getArquivoById(userId: string, eventoId: string, arquivoId: string): Promise<ArquivoEvento | null> {
    const arquivos = await this.getArquivosPorEvento(userId, eventoId);
    return arquivos.find(arquivo => arquivo.id === arquivoId) || null;
  }
}

export const arquivoRepository = new ArquivoRepository();
