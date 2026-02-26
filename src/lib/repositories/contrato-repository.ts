import { SubcollectionRepository } from './subcollection-repository';
import { Contrato } from '@/types';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { query, where, orderBy, limit, getDocs } from 'firebase/firestore';

export class ContratoRepository extends SubcollectionRepository<Contrato> {
  constructor() {
    super(COLLECTIONS.USERS, COLLECTIONS.CONTRATOS);
  }

  async findByEventoId(eventoId: string, userId: string): Promise<Contrato[]> {
    try {
      const collectionRef = this.getSubcollectionRef(userId);
      const q = query(
        collectionRef,
        where('eventoId', '==', eventoId),
        orderBy('dataCadastro', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => 
        this.convertFirestoreData(doc.data(), doc.id)
      );
    } catch (error) {
      console.error('Erro ao buscar contratos por evento:', error);
      throw error;
    }
  }

  async gerarNumeroContrato(userId: string): Promise<string> {
    try {
      const ano = new Date().getFullYear();
      const collectionRef = this.getSubcollectionRef(userId);
      
      // Buscar contratos do ano atual ordenados por número
      const q = query(
        collectionRef,
        where('numeroContrato', '>=', `CON-${ano}-000`),
        where('numeroContrato', '<=', `CON-${ano}-999`),
        orderBy('numeroContrato', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      let proximoNumero = 1;
      if (!querySnapshot.empty) {
        const ultimoNumero = querySnapshot.docs[0].data().numeroContrato;
        if (ultimoNumero) {
          const partes = ultimoNumero.split('-');
          if (partes.length === 3) {
            proximoNumero = parseInt(partes[2]) + 1;
          }
        }
      }

      return `CON-${ano}-${proximoNumero.toString().padStart(3, '0')}`;
    } catch (error: any) {
      // Se falhar por índice, buscar todos e ordenar manualmente
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.warn('Índice não encontrado, gerando número de contrato manualmente');
        const collectionRef = this.getSubcollectionRef(userId);
        const q = query(collectionRef);
        const querySnapshot = await getDocs(q);
        
        const ano = new Date().getFullYear();
        const contratos = querySnapshot.docs.map(doc => doc.data());
        const contratosAno = contratos
          .filter((c: any) => c.numeroContrato?.startsWith(`CON-${ano}-`))
          .map((c: any) => c.numeroContrato)
          .sort()
          .reverse();
        
        let proximoNumero = 1;
        if (contratosAno.length > 0) {
          const ultimoNumero = contratosAno[0];
          const partes = ultimoNumero.split('-');
          if (partes.length === 3) {
            proximoNumero = parseInt(partes[2]) + 1;
          }
        }
        
        return `CON-${ano}-${proximoNumero.toString().padStart(3, '0')}`;
      }
      throw error;
    }
  }

  async contarPorStatus(userId: string): Promise<Record<string, number>> {
    try {
      const collectionRef = this.getSubcollectionRef(userId);
      const querySnapshot = await getDocs(collectionRef);
      const contagem: Record<string, number> = {};
      
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const status = data.status || 'rascunho';
        contagem[status] = (contagem[status] || 0) + 1;
      });

      return contagem;
    } catch (error) {
      console.error('Erro ao contar contratos por status:', error);
      return {};
    }
  }
}

