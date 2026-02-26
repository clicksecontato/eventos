import { FirestoreRepository } from './firestore-repository';
import { ModeloContrato, CampoContrato } from '@/types';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export class ModeloContratoRepository extends FirestoreRepository<ModeloContrato> {
  constructor() {
    super(COLLECTIONS.MODELOS_CONTRATO);
  }

  async findAtivos(): Promise<ModeloContrato[]> {
    try {
      // Tentar com orderBy primeiro (requer índice composto)
      try {
        const q = query(
          collection(db, this.collectionName),
          where('ativo', '==', true),
          orderBy('nome')
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
      } catch (indexError: any) {
        // Se falhar por índice, buscar sem orderBy e ordenar manualmente
        if (indexError?.code === 'failed-precondition' || 
            indexError?.message?.includes('index') || 
            indexError?.message?.includes('requires an index')) {
          const q = query(
            collection(db, this.collectionName),
            where('ativo', '==', true)
          );
          const querySnapshot = await getDocs(q);
          const modelos = querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
          // Ordenar manualmente
          return modelos.sort((a, b) => a.nome.localeCompare(b.nome));
        }
        // Se for outro erro, relançar
        throw indexError;
      }
    } catch (error: any) {
      console.error('Error details:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      throw error;
    }
  }

  validarTemplate(template: string, campos: CampoContrato[]): { valido: boolean; erros: string[] } {
    const erros: string[] = [];
    const placeholders = template.match(/\{\{(\w+)\}\}/g) || [];
    const chavesCampos = new Set(campos.map(c => c.chave));
    
    placeholders.forEach(placeholder => {
      const chave = placeholder.replace(/\{\{|\}\}/g, '');
      if (!chavesCampos.has(chave)) {
        erros.push(`Placeholder '${chave}' não encontrado nos campos do modelo`);
      }
    });

    return {
      valido: erros.length === 0,
      erros
    };
  }
}
