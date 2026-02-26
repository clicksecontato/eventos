import { SubcollectionRepository } from './subcollection-repository';
import { Pagamento } from '@/types';
import { where, orderBy, limit as firestoreLimit, and, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '../firestore/collections';

export class PagamentoRepository extends SubcollectionRepository<Pagamento> {
  constructor() {
    super(COLLECTIONS.EVENTOS, COLLECTIONS.PAGAMENTOS);
  }

  // Métodos específicos para subcollections de pagamentos por evento
  private getPagamentosCollection(userId: string, eventoId: string) {
    if (!userId || !eventoId) {
      throw new Error('userId e eventoId são obrigatórios para acessar pagamentos');
    }
    return collection(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS, eventoId, COLLECTIONS.PAGAMENTOS);
  }

  async createPagamento(userId: string, eventoId: string, pagamento: Omit<Pagamento, 'id'>): Promise<Pagamento> {
    const pagamentosCollection = this.getPagamentosCollection(userId, eventoId);
    
    // Remover campos undefined antes de enviar para o Firestore
    const cleanData = { ...pagamento } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    const docRef = await addDoc(pagamentosCollection, {
      ...cleanData,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    });
    
    const pagamentoCriado = {
      id: docRef.id,
      ...pagamento,
      userId,
      eventoId,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    } as Pagamento;
    
    return pagamentoCriado;
  }

  async updatePagamento(userId: string, eventoId: string, pagamentoId: string, pagamento: Partial<Pagamento>): Promise<Pagamento> {
    const pagamentoRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS, eventoId, COLLECTIONS.PAGAMENTOS, pagamentoId);
    
    // Remover campos undefined antes de enviar para o Firestore
    const cleanData = { ...pagamento } as any;
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined) {
        delete cleanData[key];
      }
    });
    
    await updateDoc(pagamentoRef, {
      ...cleanData,
      dataAtualizacao: new Date()
    });
    
    return { id: pagamentoId, ...pagamento } as Pagamento;
  }

  async deletePagamento(userId: string, eventoId: string, pagamentoId: string): Promise<void> {
    const pagamentoRef = doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.EVENTOS, eventoId, COLLECTIONS.PAGAMENTOS, pagamentoId);
    await deleteDoc(pagamentoRef);
  }

  async findByEventoId(userId: string, eventoId: string): Promise<Pagamento[]> {
    const pagamentosCollection = this.getPagamentosCollection(userId, eventoId);
    const q = query(pagamentosCollection, orderBy('dataPagamento', 'desc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Converter Timestamps do Firestore para Date
      const pagamento = {
        id: doc.id,
        ...data,
        dataPagamento: data.dataPagamento?.toDate ? data.dataPagamento.toDate() : new Date(data.dataPagamento),
        dataCadastro: data.dataCadastro?.toDate ? data.dataCadastro.toDate() : new Date(data.dataCadastro),
        dataAtualizacao: data.dataAtualizacao?.toDate ? data.dataAtualizacao.toDate() : new Date(data.dataAtualizacao)
      };
      
      return pagamento;
    }) as Pagamento[];
  }

  async findByStatus(userId: string, eventoId: string, status: string): Promise<Pagamento[]> {
    return this.findWhere('status', '==', status, eventoId);
  }

  async findByFormaPagamento(userId: string, eventoId: string, formaPagamento: string): Promise<Pagamento[]> {
    return this.findWhere('formaPagamento', '==', formaPagamento, eventoId);
  }

  async findByDataPagamento(userId: string, eventoId: string, dataInicio: Date, dataFim: Date): Promise<Pagamento[]> {
    return this.query([
      where('dataPagamento', '>=', dataInicio),
      where('dataPagamento', '<=', dataFim),
      orderBy('dataPagamento', 'desc')
    ], eventoId);
  }

  async getPagamentosPorMes(userId: string, eventoId: string, mes: number, ano: number): Promise<Pagamento[]> {
    const inicioMes = new Date(ano, mes - 1, 1);
    const fimMes = new Date(ano, mes, 0, 23, 59, 59, 999);
    
    return this.findByDataPagamento(userId, eventoId, inicioMes, fimMes);
  }

  async getPagamentosPendentes(userId: string, eventoId: string): Promise<Pagamento[]> {
    // Busca eventos com pagamentos pendentes
    // Isso requer uma lógica mais complexa que envolve cálculos
    // Por enquanto, vamos buscar todos e filtrar no cliente
    const allPagamentos = await this.findAll(eventoId);
    return allPagamentos.filter(pagamento => pagamento.status !== 'Pago');
  }

  async getTotalRecebidoPorPeriodo(userId: string, eventoId: string, inicio: Date, fim: Date): Promise<number> {
    const pagamentos = await this.findByDataPagamento(userId, eventoId, inicio, fim);
    return pagamentos
      .filter(p => p.status === 'Pago')
      .reduce((total, pagamento) => total + pagamento.valor, 0);
  }

  async getResumoFinanceiroPorEvento(userId: string, eventoId: string, valorTotalEvento: number, dataFinalPagamento?: Date): Promise<{
    totalPago: number;
    valorPendente: number;
    valorAtrasado: number;
    quantidadePagamentos: number;
    isAtrasado: boolean;
  }> {
    const pagamentos = await this.findByEventoId(userId, eventoId);
    
    // Filtrar pagamentos cancelados nos cálculos
    const totalPago = pagamentos
      .filter(p => p.status === 'Pago' && !p.cancelado)
      .reduce((total, p) => total + p.valor, 0);
    
    const valorPendente = valorTotalEvento - totalPago;
    const hoje = new Date();
    
    // Se não tem data final de pagamento, considera como pendente
    if (!dataFinalPagamento) {
      return {
        totalPago,
        valorPendente,
        valorAtrasado: 0,
        quantidadePagamentos: pagamentos.length,
        isAtrasado: false
      };
    }
    
    const isAtrasado = hoje > dataFinalPagamento && valorPendente > 0;
    
    // Contar apenas pagamentos não cancelados
    const pagamentosAtivos = pagamentos.filter(p => !p.cancelado);
    
    return {
      totalPago,
      valorPendente: isAtrasado ? 0 : valorPendente,
      valorAtrasado: isAtrasado ? valorPendente : 0,
      quantidadePagamentos: pagamentosAtivos.length,
      isAtrasado
    };
  }
}
