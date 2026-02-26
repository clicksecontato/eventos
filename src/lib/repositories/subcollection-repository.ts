import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  startAfter,
  DocumentData,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { BaseRepository, RepositoryResult } from './base-repository';

export class SubcollectionRepository<T extends { id: string }> implements BaseRepository<T> {
  protected parentCollection: string;
  protected subcollectionName: string;

  constructor(parentCollection: string, subcollectionName: string) {
    this.parentCollection = parentCollection;
    this.subcollectionName = subcollectionName;
  }

  protected convertFirestoreData(data: DocumentData, id: string): T {
    const converted = { ...data, id } as any;
    
    // Converter Timestamps para Date
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Timestamp) {
        converted[key] = converted[key].toDate();
      }
    });
    
    return converted as T;
  }

  protected convertToFirestoreData(data: Partial<T>): any {
    const converted = { ...data } as any;
    
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

  protected getSubcollectionRef(parentId: string) {
    return collection(db, this.parentCollection, parentId, this.subcollectionName);
  }

  protected getSubcollectionDocRef(parentId: string, docId: string) {
    return doc(db, this.parentCollection, parentId, this.subcollectionName, docId);
  }

  async create(entity: Omit<T, 'id'>, parentId?: string): Promise<T> {
    if (!parentId) {
      throw new Error('parentId is required for subcollection operations');
    }
    try {
      const docRef = await addDoc(this.getSubcollectionRef(parentId), this.convertToFirestoreData(entity as Partial<T>));
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found after creation');
      }
      
      return this.convertFirestoreData(docSnap.data(), docRef.id);
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string, parentId?: string): Promise<T | null> {
    if (!parentId) {
      throw new Error('parentId is required for subcollection operations');
    }
    try {
      const docRef = this.getSubcollectionDocRef(parentId, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return this.convertFirestoreData(docSnap.data(), id);
    } catch (error) {
      throw error;
    }
  }

  async findAll(parentId?: string): Promise<T[]> {
    if (!parentId) {
      throw new Error('parentId is required for subcollection operations');
    }
    try {
      const querySnapshot = await getDocs(this.getSubcollectionRef(parentId));
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
    } catch (error: any) {
      // No Firestore, se a subcollection não existe ainda, getDocs pode retornar uma lista vazia ou lançar erro
      // Se for um erro de "not found" ou subcollection não existe, retornar lista vazia
      if (error?.code === 'not-found' || error?.message?.includes('not found')) {
        return [];
      }
      throw error;
    }
  }

  async update(id: string, entity: Partial<T>, parentId?: string): Promise<T> {
    if (!parentId) {
      throw new Error('parentId is required for subcollection operations');
    }
    try {
      const docRef = this.getSubcollectionDocRef(parentId, id);
      await updateDoc(docRef, this.convertToFirestoreData(entity));
      
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Document not found after update');
      }
      
      return this.convertFirestoreData(updatedDoc.data(), id);
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string, parentId?: string): Promise<void> {
    if (!parentId) {
      throw new Error('parentId is required for subcollection operations');
    }
    try {
      const docRef = this.getSubcollectionDocRef(parentId, id);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  }

  async findWhere(field: string, operator: any, value: any, parentId?: string): Promise<T[]> {
    if (!parentId) {
      throw new Error('parentId is required for subcollection operations');
    }
    try {
      const q = query(this.getSubcollectionRef(parentId), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
    } catch (error) {
      throw error;
    }
  }

  async query(constraints: QueryConstraint[], parentId: string): Promise<T[]> {
    try {
      const q = query(this.getSubcollectionRef(parentId), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
    } catch (error) {
      throw error;
    }
  }

  async getAtivos(parentId: string): Promise<T[]> {
    try {
      const collectionRef = collection(db, this.parentCollection, parentId, this.subcollectionName);
      
      // Primeiro tentar buscar todos os documentos
      try {
        const q = query(collectionRef);
        const querySnapshot = await getDocs(q);
        
        const allResults = querySnapshot.docs.map(doc => 
          this.convertFirestoreData(doc.data(), doc.id)
        );
        
        // Filtrar apenas os ativos e ordenar
        // IMPORTANTE: itens com ativo === false NÃO devem aparecer aqui
        const activeResults = allResults.filter((item: any) => {
          const ativo = item.ativo;
          // Apenas itens com ativo === true OU undefined/null (dados antigos sem migração)
          // Itens com ativo === false são explicitamente inativos e NÃO devem aparecer
          return ativo === true || ativo === undefined || ativo === null;
        });
        
        return activeResults.sort((a, b) => (a as any).nome.localeCompare((b as any).nome));
      } catch (error) {
        // Se der erro, tentar com where
        const q = query(collectionRef, where('ativo', '==', true));
        const querySnapshot = await getDocs(q);
        
        const results = querySnapshot.docs.map(doc => 
          this.convertFirestoreData(doc.data(), doc.id)
        );
        
        // Ordenar manualmente
        return results.sort((a, b) => (a as any).nome.localeCompare((b as any).nome));
      }
    } catch (error) {
      throw error;
    }
  }
}
