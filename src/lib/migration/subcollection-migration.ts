import { db } from '../firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { COLLECTIONS } from '../firestore/collections';

export interface MigrationResult {
  success: boolean;
  message: string;
  migratedCount: number;
  errors: string[];
}

export class SubcollectionMigrationService {
  private batch = writeBatch(db);

  async migrateToSubcollections(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      migratedCount: 0,
      errors: []
    };

    try {
      console.log('🚀 Iniciando migração para subcollections...');

      // 1. Migrar clientes
      const clientesResult = await this.migrateClientes();
      result.migratedCount += clientesResult.migratedCount;
      result.errors.push(...clientesResult.errors);

      // 2. Migrar eventos
      const eventosResult = await this.migrateEventos();
      result.migratedCount += eventosResult.migratedCount;
      result.errors.push(...eventosResult.errors);

      // 3. Migrar tipos de custo
      const tiposCustoResult = await this.migrateTiposCusto();
      result.migratedCount += tiposCustoResult.migratedCount;
      result.errors.push(...tiposCustoResult.errors);

      // 4. Migrar pagamentos e custos (subcollections de eventos)
      const pagamentosResult = await this.migratePagamentos();
      result.migratedCount += pagamentosResult.migratedCount;
      result.errors.push(...pagamentosResult.errors);

      const custosResult = await this.migrateCustos();
      result.migratedCount += custosResult.migratedCount;
      result.errors.push(...custosResult.errors);

      // 5. Limpar collections antigas
      await this.cleanupOldCollections();

      result.success = result.errors.length === 0;
      result.message = `Migração concluída! ${result.migratedCount} documentos migrados.`;

      console.log('✅ Migração concluída:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro na migração:', error);
      result.errors.push(`Erro geral: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return result;
    }
  }

  private async migrateClientes(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      migratedCount: 0,
      errors: []
    };

    try {
      console.log('📋 Migrando clientes...');
      
      // Buscar todos os clientes da collection antiga
      const clientesSnapshot = await getDocs(collection(db, 'controle_clientes'));
      
      for (const clienteDoc of clientesSnapshot.docs) {
        const clienteData = clienteDoc.data();
        const userId = clienteData.userId;
        
        if (!userId) {
          result.errors.push(`Cliente ${clienteDoc.id} sem userId - pulando`);
          continue;
        }

        // Remover userId dos dados (agora é parte do path)
        const { userId: _, ...clienteWithoutUserId } = clienteData;

        // Criar na nova estrutura (subcollection)
        const newDocRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.CLIENTES));
        this.batch.set(newDocRef, clienteWithoutUserId);

        result.migratedCount++;
      }

      await this.batch.commit();
      result.success = true;
      result.message = `${result.migratedCount} clientes migrados`;

    } catch (error) {
      result.errors.push(`Erro ao migrar clientes: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return result;
  }

  private async migrateEventos(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      migratedCount: 0,
      errors: []
    };

    try {
      console.log('📅 Migrando eventos...');
      
      // Buscar todos os eventos da collection antiga
      const eventosSnapshot = await getDocs(collection(db, 'controle_eventos'));
      
      for (const eventoDoc of eventosSnapshot.docs) {
        const eventoData = eventoDoc.data();
        const userId = eventoData.userId;
        
        if (!userId) {
          result.errors.push(`Evento ${eventoDoc.id} sem userId - pulando`);
          continue;
        }

        // Remover userId dos dados (agora é parte do path)
        const { userId: _, ...eventoWithoutUserId } = eventoData;

        // Criar na nova estrutura (subcollection)
        const newDocRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS));
        this.batch.set(newDocRef, eventoWithoutUserId);

        result.migratedCount++;
      }

      await this.batch.commit();
      result.success = true;
      result.message = `${result.migratedCount} eventos migrados`;

    } catch (error) {
      result.errors.push(`Erro ao migrar eventos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return result;
  }

  private async migrateTiposCusto(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      migratedCount: 0,
      errors: []
    };

    try {
      console.log('💰 Migrando tipos de custo...');
      
      // Buscar todos os tipos de custo da collection antiga
      const tiposSnapshot = await getDocs(collection(db, 'controle_tipo_custos'));
      
      for (const tipoDoc of tiposSnapshot.docs) {
        const tipoData = tipoDoc.data();
        const userId = tipoData.userId;
        
        if (!userId) {
          result.errors.push(`Tipo de custo ${tipoDoc.id} sem userId - pulando`);
          continue;
        }

        // Remover userId dos dados (agora é parte do path)
        const { userId: _, ...tipoWithoutUserId } = tipoData;

        // Criar na nova estrutura (subcollection)
        const newDocRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.TIPO_CUSTOS));
        this.batch.set(newDocRef, tipoWithoutUserId);

        result.migratedCount++;
      }

      await this.batch.commit();
      result.success = true;
      result.message = `${result.migratedCount} tipos de custo migrados`;

    } catch (error) {
      result.errors.push(`Erro ao migrar tipos de custo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return result;
  }

  private async migratePagamentos(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      migratedCount: 0,
      errors: []
    };

    try {
      console.log('💳 Migrando pagamentos...');
      
      // Buscar todos os pagamentos da collection antiga
      const pagamentosSnapshot = await getDocs(collection(db, 'controle_pagamentos'));
      
      for (const pagamentoDoc of pagamentosSnapshot.docs) {
        const pagamentoData = pagamentoDoc.data();
        const eventoId = pagamentoData.eventoId;
        
        if (!eventoId) {
          result.errors.push(`Pagamento ${pagamentoDoc.id} sem eventoId - pulando`);
          continue;
        }

        // Buscar o evento para obter o userId
        const eventoSnapshot = await getDocs(collection(db, 'controle_eventos'));
        let userId = null;
        
        for (const eventoDoc of eventoSnapshot.docs) {
          if (eventoDoc.id === eventoId) {
            userId = eventoDoc.data().userId;
            break;
          }
        }

        if (!userId) {
          result.errors.push(`Pagamento ${pagamentoDoc.id} - evento ${eventoId} não encontrado - pulando`);
          continue;
        }

        // Remover eventoId dos dados (agora é parte do path)
        const { eventoId: _, ...pagamentoWithoutEventoId } = pagamentoData;

        // Criar na nova estrutura (subcollection de evento)
        const newDocRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS, eventoId, COLLECTIONS.PAGAMENTOS));
        this.batch.set(newDocRef, pagamentoWithoutEventoId);

        result.migratedCount++;
      }

      await this.batch.commit();
      result.success = true;
      result.message = `${result.migratedCount} pagamentos migrados`;

    } catch (error) {
      result.errors.push(`Erro ao migrar pagamentos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return result;
  }

  private async migrateCustos(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      migratedCount: 0,
      errors: []
    };

    try {
      console.log('💸 Migrando custos...');
      
      // Buscar todos os custos da collection antiga
      const custosSnapshot = await getDocs(collection(db, 'controle_custos'));
      
      for (const custoDoc of custosSnapshot.docs) {
        const custoData = custoDoc.data();
        const eventoId = custoData.eventoId;
        
        if (!eventoId) {
          result.errors.push(`Custo ${custoDoc.id} sem eventoId - pulando`);
          continue;
        }

        // Buscar o evento para obter o userId
        const eventoSnapshot = await getDocs(collection(db, 'controle_eventos'));
        let userId = null;
        
        for (const eventoDoc of eventoSnapshot.docs) {
          if (eventoDoc.id === eventoId) {
            userId = eventoDoc.data().userId;
            break;
          }
        }

        if (!userId) {
          result.errors.push(`Custo ${custoDoc.id} - evento ${eventoId} não encontrado - pulando`);
          continue;
        }

        // Remover eventoId dos dados (agora é parte do path)
        const { eventoId: _, ...custoWithoutEventoId } = custoData;

        // Criar na nova estrutura (subcollection de evento)
        const newDocRef = doc(collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS, eventoId, COLLECTIONS.CUSTOS));
        this.batch.set(newDocRef, custoWithoutEventoId);

        result.migratedCount++;
      }

      await this.batch.commit();
      result.success = true;
      result.message = `${result.migratedCount} custos migrados`;

    } catch (error) {
      result.errors.push(`Erro ao migrar custos: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }

    return result;
  }

  private async cleanupOldCollections(): Promise<void> {
    try {
      console.log('🧹 Limpando collections antigas...');
      
      const collectionsToClean = [
        'controle_clientes',
        'controle_eventos', 
        'controle_tipo_custos',
        'controle_pagamentos',
        'controle_custos'
      ];

      for (const collectionName of collectionsToClean) {
        const snapshot = await getDocs(collection(db, collectionName));
        
        for (const docSnapshot of snapshot.docs) {
          this.batch.delete(docSnapshot.ref);
        }
      }

      await this.batch.commit();
      console.log('✅ Collections antigas limpas');

    } catch (error) {
      console.error('❌ Erro ao limpar collections antigas:', error);
    }
  }
}

export const subcollectionMigrationService = new SubcollectionMigrationService();
