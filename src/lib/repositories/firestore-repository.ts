import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
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

export class FirestoreRepository<T extends { id: string }> implements BaseRepository<T> {
  protected collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
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
    
    // Função recursiva para remover undefined e converter Dates
    const cleanValue = (value: any): any => {
      if (value === undefined) {
        return undefined; // Será removido na iteração
      }
      
      if (value === null) {
        return null;
      }
      
      if (value instanceof Date) {
        return Timestamp.fromDate(value);
      }
      
      if (Array.isArray(value)) {
        return value.map(cleanValue).filter(item => item !== undefined);
      }
      
      if (typeof value === 'object') {
        const cleaned: any = {};
        for (const key in value) {
          const cleanedValue = cleanValue(value[key]);
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
          }
        }
        return cleaned;
      }
      
      return value;
    };
    
    // Remover campos undefined e converter Dates para Timestamps
    const result: any = {};
    Object.keys(converted).forEach(key => {
      const cleanedValue = cleanValue(converted[key]);
      if (cleanedValue !== undefined) {
        result[key] = cleanedValue;
      }
    });
    
    return result;
  }

  async create(entity: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = await addDoc(collection(db, this.collectionName), this.convertToFirestoreData(entity as Partial<T>));
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found after creation');
      }
      
      return this.convertFirestoreData(docSnap.data(), docRef.id);
    } catch (error) {
      throw error;
    }
  }

  async setWithId(id: string, entity: Omit<T, 'id'>): Promise<T> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const firestoreData = this.convertToFirestoreData(entity as Partial<T>);
      await setDoc(docRef, firestoreData);
      return this.convertFirestoreData(firestoreData, id);
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string): Promise<T | null> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        return null;
      }
      
      return this.convertFirestoreData(docSnap.data(), id);
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<T[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, entity: Partial<T>): Promise<T> {
    try {
      const docRef = doc(db, this.collectionName, id);
      const firestoreData = this.convertToFirestoreData(entity);
      
      await updateDoc(docRef, firestoreData);
      
      // Aguardar um pouco para garantir que o Firestore processou
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const updatedDoc = await getDoc(docRef);
      if (!updatedDoc.exists()) {
        throw new Error('Document not found after update');
      }
      
      const converted = this.convertFirestoreData(updatedDoc.data(), id);
      
      return converted;
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  }

  async findWhere(field: string, operator: any, value: any): Promise<T[]> {
    try {
      const q = query(collection(db, this.collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
    } catch (error) {
      throw error;
    }
  }

  async query(constraints: QueryConstraint[]): Promise<T[]> {
    try {
      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.convertFirestoreData(doc.data(), doc.id));
    } catch (error) {
      throw error;
    }
  }
}
