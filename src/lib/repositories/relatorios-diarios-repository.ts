import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '../firestore/collections';

export interface DashboardRelatorioPersistido {
  data: Record<string, any>;
  meta?: {
    totalEventos: number;
    totalPagamentos: number;
    geradoEm: string;
  };
}

export interface RelatorioPersistido {
  data: Record<string, any>;
  meta?: {
    geradoEm: string;
    [key: string]: any;
  };
}

export interface RelatorioDiario {
  id: string;
  dateKey: string;
  dataGeracao: Date;
  dashboard?: DashboardRelatorioPersistido;
  detalhamentoReceber?: RelatorioPersistido;
  receitaMensal?: RelatorioPersistido;
  performanceEventos?: RelatorioPersistido;
  fluxoCaixa?: RelatorioPersistido;
  servicos?: RelatorioPersistido;
  canaisEntrada?: RelatorioPersistido;
  impressoes?: RelatorioPersistido;
}

export class RelatoriosDiariosRepository {
  private getDocRef(userId: string, dateKey: string) {
    if (!userId) {
      throw new Error('userId é obrigatório para acessar relatórios diários');
    }
    if (!dateKey) {
      throw new Error('dateKey é obrigatório para acessar relatórios diários');
    }

    return doc(db, COLLECTIONS.USERS, userId, COLLECTIONS.RELATORIOS_DIARIOS, dateKey);
  }

  async getRelatorioDiario(userId: string, dateKey: string): Promise<RelatorioDiario | null> {
    const docRef = this.getDocRef(userId, dateKey);
    const snapshot = await getDoc(docRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    const dataGeracao = data.dataGeracao instanceof Timestamp ? data.dataGeracao.toDate() : new Date(data.dataGeracao);

    return {
      id: snapshot.id,
      dateKey: data.dateKey || snapshot.id,
      dataGeracao,
      dashboard: data.dashboard || undefined,
      detalhamentoReceber: data.detalhamentoReceber || undefined,
      receitaMensal: data.receitaMensal || undefined,
      performanceEventos: data.performanceEventos || undefined,
      fluxoCaixa: data.fluxoCaixa || undefined,
      servicos: data.servicos || undefined,
      canaisEntrada: data.canaisEntrada || undefined,
      impressoes: data.impressoes || undefined
    };
  }

  async salvarDashboard(
    userId: string,
    dateKey: string,
    payload: DashboardRelatorioPersistido,
    dataGeracao: Date
  ): Promise<void> {
    const docRef = this.getDocRef(userId, dateKey);

    await setDoc(
      docRef,
      {
        dateKey,
        dataGeracao: Timestamp.fromDate(dataGeracao),
        dashboard: payload
      },
      { merge: true }
    );
  }

  async salvarRelatorio(
    userId: string,
    dateKey: string,
    tipoRelatorio: 'detalhamentoReceber' | 'receitaMensal' | 'performanceEventos' | 'fluxoCaixa' | 'servicos' | 'canaisEntrada' | 'impressoes',
    payload: RelatorioPersistido,
    dataGeracao: Date
  ): Promise<void> {
    const docRef = this.getDocRef(userId, dateKey);

    await setDoc(
      docRef,
      {
        dateKey,
        dataGeracao: Timestamp.fromDate(dataGeracao),
        [tipoRelatorio]: payload
      },
      { merge: true }
    );
  }

  async salvarMultiplosRelatorios(
    userId: string,
    dateKey: string,
    relatorios: Partial<Record<'detalhamentoReceber' | 'receitaMensal' | 'performanceEventos' | 'fluxoCaixa' | 'servicos' | 'canaisEntrada' | 'impressoes', RelatorioPersistido>>,
    dataGeracao: Date
  ): Promise<void> {
    const docRef = this.getDocRef(userId, dateKey);

    await setDoc(
      docRef,
      {
        dateKey,
        dataGeracao: Timestamp.fromDate(dataGeracao),
        ...relatorios
      },
      { merge: true }
    );
  }
}

