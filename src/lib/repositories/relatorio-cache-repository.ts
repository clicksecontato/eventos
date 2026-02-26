import { SubcollectionRepository } from './subcollection-repository';
import { RelatorioSnapshot } from '@/types/relatorios';
import { where, orderBy, limit as firestoreLimit, query, getDocs, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '../firestore/collections';

// Tipo auxiliar que garante que id seja obrigatório para uso com SubcollectionRepository
type RelatorioSnapshotWithId = RelatorioSnapshot & { id: string };

export class RelatorioCacheRepository extends SubcollectionRepository<RelatorioSnapshotWithId> {
  constructor() {
    super(COLLECTIONS.USERS, COLLECTIONS.RELATORIOS_CACHE);
  }

  /**
   * Busca o snapshot mais recente de relatórios para um usuário
   */
  async getLatestSnapshot(userId: string): Promise<RelatorioSnapshot | null> {
    if (!userId) {
      throw new Error('userId é obrigatório para buscar snapshot de relatórios');
    }

    try {
      const collectionRef = this.getSubcollectionRef(userId);
      const q = query(
        collectionRef,
        orderBy('dataGeracao', 'desc'),
        firestoreLimit(1)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const docSnapshot = querySnapshot.docs[0];
      const data = docSnapshot.data();

      return this.convertFirestoreData(data, docSnapshot.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Cria ou atualiza um snapshot de relatórios
   * Usa o ID do snapshot baseado na data (yyyy-MM-dd) para garantir um único snapshot por dia
   */
  async createOrUpdateSnapshot(userId: string, snapshot: RelatorioSnapshot): Promise<RelatorioSnapshot> {
    if (!userId) {
      throw new Error('userId é obrigatório para criar snapshot de relatórios');
    }

    try {
      // Gerar ID baseado na data (yyyy-MM-dd) para garantir um snapshot por dia
      const dataSnapshot = new Date(snapshot.dataGeracao);
      const snapshotId = dataSnapshot.toISOString().split('T')[0]; // yyyy-MM-dd

      const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RELATORIOS_CACHE, snapshotId);

      // Converter dados para formato Firestore
      const firestoreData = this.convertToFirestoreData({
        ...snapshot,
        id: snapshotId
      });

      await setDoc(docRef, {
        ...firestoreData,
        dataGeracao: firestoreData.dataGeracao || new Date()
      }, { merge: true });

      return {
        ...snapshot,
        id: snapshotId
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Busca um snapshot específico por ID (data yyyy-MM-dd)
   */
  async getSnapshotById(userId: string, snapshotId: string): Promise<RelatorioSnapshot | null> {
    if (!userId || !snapshotId) {
      throw new Error('userId e snapshotId são obrigatórios');
    }

    try {
      const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RELATORIOS_CACHE, snapshotId);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return null;
      }

      const data = docSnapshot.data();
      return this.convertFirestoreData(data, docSnapshot.id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Lista todos os snapshots disponíveis para um usuário (últimos N dias)
   */
  async listSnapshots(userId: string, limit: number = 30): Promise<RelatorioSnapshot[]> {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    try {
      const collectionRef = this.getSubcollectionRef(userId);
      const q = query(
        collectionRef,
        orderBy('dataGeracao', 'desc'),
        firestoreLimit(limit)
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return this.convertFirestoreData(data, doc.id);
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Remove snapshots antigos (mantém apenas os últimos N dias)
   */
  async cleanupOldSnapshots(userId: string, keepDays: number = 30): Promise<void> {
    if (!userId) {
      throw new Error('userId é obrigatório');
    }

    try {
      const snapshots = await this.listSnapshots(userId, 1000); // Buscar muitos para filtrar
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const snapshotsToDelete = snapshots.filter(snapshot => {
        const snapshotDate = new Date(snapshot.dataGeracao);
        return snapshotDate < cutoffDate;
      });

      // Deletar snapshots antigos
      const deletePromises = snapshotsToDelete.map(snapshot => {
        if (!snapshot.id) return Promise.resolve();
        const docRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RELATORIOS_CACHE, snapshot.id);
        return deleteDoc(docRef);
      });

      await Promise.all(deletePromises);

    } catch (error) {
      // Não lançar erro para não bloquear o processo principal
    }
  }
}

