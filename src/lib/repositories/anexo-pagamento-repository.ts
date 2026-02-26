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
import { AnexoPagamento } from '@/types';

export class AnexoPagamentoRepository {
  private getAnexosCollection(userId: string, eventoId: string, pagamentoId: string) {
    return collection(
      db, 
      COLLECTIONS.USERS, 
      userId, 
      COLLECTIONS.EVENTOS, 
      eventoId, 
      COLLECTIONS.PAGAMENTOS, 
      pagamentoId, 
      'anexos_pagamentos'
    );
  }

  async createAnexo(
    userId: string,
    eventoId: string,
    pagamentoId: string,
    anexo: Omit<AnexoPagamento, 'id' | 'dataCadastro'>
  ): Promise<AnexoPagamento> {
    const anexosCollection = this.getAnexosCollection(userId, eventoId, pagamentoId);
    
    const anexoData = {
      ...anexo,
      dataCadastro: new Date(),
    };

    const docRef = await addDoc(anexosCollection, anexoData);
    
    return {
      id: docRef.id,
      ...anexoData,
    };
  }

  async getAnexosPorPagamento(
    userId: string, 
    eventoId: string, 
    pagamentoId: string
  ): Promise<AnexoPagamento[]> {
    const anexosCollection = this.getAnexosCollection(userId, eventoId, pagamentoId);
    const q = query(anexosCollection, orderBy('dataUpload', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        dataUpload: data.dataUpload?.toDate ? data.dataUpload.toDate() : new Date(data.dataUpload),
        dataCadastro: data.dataCadastro?.toDate ? data.dataCadastro.toDate() : new Date(data.dataCadastro),
      } as AnexoPagamento;
    });
  }

  async deleteAnexo(
    userId: string, 
    eventoId: string, 
    pagamentoId: string, 
    anexoId: string
  ): Promise<void> {
    const anexoDoc = doc(this.getAnexosCollection(userId, eventoId, pagamentoId), anexoId);
    await deleteDoc(anexoDoc);
  }

  async getAnexoById(
    userId: string, 
    eventoId: string, 
    pagamentoId: string, 
    anexoId: string
  ): Promise<AnexoPagamento | null> {
    const anexos = await this.getAnexosPorPagamento(userId, eventoId, pagamentoId);
    return anexos.find(anexo => anexo.id === anexoId) || null;
  }
}

export const anexoPagamentoRepository = new AnexoPagamentoRepository();
