import { format, startOfDay, endOfDay, subMonths } from 'date-fns';
import { repositoryFactory } from '../repositories/repository-factory';
import {
  DashboardData,
  DashboardEventoResumo,
  DashboardPeriodoResumo,
  Evento,
  Pagamento
} from '@/types';
import { filtrarEventosValidos, filtrarEventosValidosComValor } from '../utils/evento-filters';

interface DashboardFontes {
  eventos: Evento[];
  pagamentos: Pagamento[];
  hoje: Date;
}

const PERIODOS_MESES = [
  { id: '3m', label: 'Últimos 3 meses', meses: 3 },
  { id: '6m', label: 'Últimos 6 meses', meses: 6 },
  { id: '12m', label: 'Últimos 12 meses', meses: 12 },
  { id: '24m', label: 'Últimos 24 meses', meses: 24 }
] as const;

export class DashboardReportService {
  private static instance: DashboardReportService;

  private eventoRepo = repositoryFactory.getEventoRepository();
  private pagamentoRepo = repositoryFactory.getPagamentoRepository();
  private relatoriosRepo = repositoryFactory.getRelatoriosDiariosRepository();

  static getInstance(): DashboardReportService {
    if (!DashboardReportService.instance) {
      DashboardReportService.instance = new DashboardReportService();
    }

    return DashboardReportService.instance;
  }

  async getDashboardData(userId: string, options?: { forceRefresh?: boolean }): Promise<DashboardData> {
    if (!userId) {
      throw new Error('userId é obrigatório para carregar o dashboard');
    }

    const hoje = new Date();
    const dateKey = format(hoje, 'yyyyMMdd');

    if (!options?.forceRefresh) {
      const cached = await this.relatoriosRepo.getRelatorioDiario(userId, dateKey);
      if (cached?.dashboard?.data) {
        return this.deserializeDashboardData(cached.dashboard.data, cached.dataGeracao);
      }
    }

    return this.gerarDashboard(userId, hoje, dateKey);
  }

  async forceRefresh(userId: string): Promise<DashboardData> {
    const hoje = new Date();
    const dateKey = format(hoje, 'yyyyMMdd');
    return this.gerarDashboard(userId, hoje, dateKey);
  }

  private async gerarDashboard(userId: string, referencia: Date, dateKey: string): Promise<DashboardData> {
    // Removido initializeAllCollections() - não é necessário e causa queries desnecessárias de subcollections

    const [eventos, pagamentos] = await Promise.all([
      this.eventoRepo.findAll(userId),
      this.pagamentoRepo.findAll(userId)
    ]);

    const fontes: DashboardFontes = {
      eventos,
      pagamentos,
      hoje: referencia
    };

    const dashboardBase = this.calcularDashboardData(fontes);
    const periodosResumo = this.calcularPeriodosResumo(fontes);

    const resultado: DashboardData = {
      ...dashboardBase,
      periodosResumo,
      lastUpdatedAt: referencia
    };

    await this.relatoriosRepo.salvarDashboard(
      userId,
      dateKey,
      {
        data: this.serializeDashboardData(resultado),
        meta: {
          totalEventos: eventos.length,
          totalPagamentos: pagamentos.length,
          geradoEm: referencia.toISOString()
        }
      },
      referencia
    );

    return resultado;
  }

  private calcularDashboardData({ eventos, pagamentos, hoje }: DashboardFontes): DashboardData {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = endOfDay(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
    const fimAno = endOfDay(new Date(hoje.getFullYear(), 11, 31));

    const eventosHoje = eventosValidos.filter(evento => {
      const dataEvento = new Date(evento.dataEvento);
      return dataEvento.toDateString() === hoje.toDateString();
    });

    const eventosMes = eventosValidos.filter(evento => {
      const dataEvento = new Date(evento.dataEvento);
      return dataEvento >= inicioMes && dataEvento <= fimMes;
    });

    const proximos7Dias = new Date(hoje);
    proximos7Dias.setDate(hoje.getDate() + 7);
    proximos7Dias.setHours(23, 59, 59, 999);
    const hojeInicio = startOfDay(hoje);

    const eventosProximos = eventosValidos.filter(evento => {
      const dataEvento = new Date(evento.dataEvento);
      return dataEvento >= hojeInicio && dataEvento <= proximos7Dias;
    });

    const pagamentosMes = pagamentos.filter(pagamento => {
      if (!pagamento.dataPagamento) return false;
      const dataPagamento = new Date(pagamento.dataPagamento);
      return dataPagamento >= inicioMes && dataPagamento <= fimMes && pagamento.status === 'Pago' && !pagamento.cancelado;
    });

    const pagamentosAno = pagamentos.filter(pagamento => {
      if (!pagamento.dataPagamento) return false;
      const dataPagamento = new Date(pagamento.dataPagamento);
      return dataPagamento >= inicioAno && dataPagamento <= fimAno && pagamento.status === 'Pago' && !pagamento.cancelado;
    });

    const receitaMes = pagamentosMes.reduce((total, pagamento) => total + pagamento.valor, 0);
    const receitaAno = pagamentosAno.reduce((total, pagamento) => total + pagamento.valor, 0);

    let valorPendente = 0;
    let valorAtrasado = 0;
    let pagamentosPendentes = 0;
    let eventosComValoresAtrasados = 0;
    let eventosComValoresPendentes = 0;

    // Usar apenas eventos válidos com valor para cálculos financeiros
    const eventosValidosComValor = filtrarEventosValidosComValor(eventos);
    
    eventosValidosComValor.forEach(evento => {
      const valorPrevisto = evento.valorTotal || 0;
      if (valorPrevisto <= 0) {
        return;
      }

      const resumo = this.calcularResumoFinanceiroPorEvento(
        evento.id,
        valorPrevisto,
        pagamentos,
        evento.diaFinalPagamento ? new Date(evento.diaFinalPagamento) : undefined
      );

      const valorRestante = resumo.valorPendente + resumo.valorAtrasado;
      if (valorRestante > 0) {
        valorPendente += resumo.valorPendente;
        valorAtrasado += resumo.valorAtrasado;

        // Separar contagem de eventos com valores atrasados vs pendentes
        if (resumo.valorAtrasado > 0) {
          eventosComValoresAtrasados++;
        }
        if (resumo.valorPendente > 0) {
          eventosComValoresPendentes++;
        }

        // Manter compatibilidade: pagamentosPendentes = total de eventos com valores não pagos
        if (resumo.valorPendente > 0 || resumo.valorAtrasado > 0) {
          pagamentosPendentes++;
        }
      }
    });

    const eventosPorTipo: Record<string, number> = {};
    eventosValidos.forEach(evento => {
      eventosPorTipo[evento.tipoEvento] = (eventosPorTipo[evento.tipoEvento] || 0) + 1;
    });

    return {
      eventosHoje: eventosHoje.length,
      eventosHojeLista: eventosHoje.map(this.mapearEventoResumo),
      eventosMes: eventosMes.length,
      receitaMes,
      receitaAno,
      pagamentosPendentes,
      valorPendente,
      valorAtrasado,
      eventosComValoresAtrasados,
      eventosComValoresPendentes,
      eventosProximos: eventosProximos
        .sort((a, b) => new Date(a.dataEvento).getTime() - new Date(b.dataEvento).getTime())
        .map(this.mapearEventoResumo),
      pagamentosVencendo: [],
      resumoFinanceiro: {
        receitaTotal: receitaAno,
        receitaMes,
        valorPendente,
        valorAtrasado,
        totalEventos: eventosValidos.length,
        eventosConcluidos: eventosValidos.filter(e => e.status === 'Concluído').length
      },
      graficos: {
        receitaMensal: [],
        eventosPorTipo: Object.entries(eventosPorTipo).map(([tipo, quantidade]) => ({
          tipo,
          quantidade
        })),
        statusPagamentos: []
      }
    };
  }

  private calcularPeriodosResumo({ eventos, pagamentos, hoje }: DashboardFontes): DashboardPeriodoResumo[] {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    return PERIODOS_MESES.map(periodo => {
      const fim = endOfDay(hoje);
      const inicio = startOfDay(subMonths(fim, periodo.meses));

      const eventosPeriodo = eventosValidos.filter(evento => {
        const dataEvento = new Date(evento.dataEvento);
        return dataEvento >= inicio && dataEvento <= fim;
      });

      const pagamentosPeriodo = pagamentos.filter(pagamento => {
        if (!pagamento.dataPagamento) return false;
        const dataPagamento = new Date(pagamento.dataPagamento);
        return (
          dataPagamento >= inicio &&
          dataPagamento <= fim &&
          pagamento.status === 'Pago' &&
          !pagamento.cancelado
        );
      });

      const receitaRecebida = pagamentosPeriodo.reduce((total, pagamento) => total + pagamento.valor, 0);

      let valorPendente = 0;
      let valorAtrasado = 0;

      // Usar apenas eventos válidos com valor para cálculos financeiros
      const eventosPeriodoValidosComValor = eventosPeriodo.filter(e => 
        (e.valorTotal || 0) > 0
      );

      eventosPeriodoValidosComValor.forEach(evento => {
        const valorPrevisto = evento.valorTotal || 0;
        if (valorPrevisto <= 0) return;

        const resumo = this.calcularResumoFinanceiroPorEvento(
          evento.id,
          valorPrevisto,
          pagamentos,
          evento.diaFinalPagamento ? new Date(evento.diaFinalPagamento) : undefined
        );

        valorPendente += resumo.valorPendente;
        valorAtrasado += resumo.valorAtrasado;
      });

      const ticketMedio = eventosPeriodo.length === 0 ? 0 : receitaRecebida / eventosPeriodo.length;

      return {
        id: periodo.id,
        label: periodo.label,
        meses: periodo.meses,
        inicio,
        fim,
        eventos: eventosPeriodo.length,
        receitaRecebida,
        pagamentosRecebidos: pagamentosPeriodo.length,
        valorPendente,
        valorAtrasado,
        ticketMedio
      };
    });
  }

  private calcularResumoFinanceiroPorEvento(
    eventoId: string,
    valorTotalEvento: number,
    pagamentos: Pagamento[],
    dataFinalPagamento?: Date
  ) {
    const pagamentosEvento = pagamentos.filter(p => {
      const pEventoId = p.eventoId || (p as any).evento?.id;
      return pEventoId === eventoId && !p.cancelado;
    });

    const totalPago = pagamentosEvento
      .filter(p => p.status === 'Pago')
      .reduce((total, p) => total + p.valor, 0);

    const valorPendente = valorTotalEvento - totalPago;
    const hoje = new Date();

    if (!dataFinalPagamento) {
      return {
        totalPago,
        valorPendente,
        valorAtrasado: 0,
        quantidadePagamentos: pagamentosEvento.length,
        isAtrasado: false
      };
    }

    const isAtrasado = hoje > dataFinalPagamento && valorPendente > 0;

    return {
      totalPago,
      valorPendente: isAtrasado ? 0 : valorPendente,
      valorAtrasado: isAtrasado ? valorPendente : 0,
      quantidadePagamentos: pagamentosEvento.length,
      isAtrasado
    };
  }

  private mapearEventoResumo = (evento: Evento): DashboardEventoResumo => ({
    id: evento.id,
    clienteNome: evento.cliente?.nome || (evento as any).clienteNome || 'Cliente',
    local: evento.local,
    tipoEvento: evento.tipoEvento,
    status: evento.status,
    dataEvento: evento.dataEvento instanceof Date ? evento.dataEvento : new Date(evento.dataEvento),
    chegadaNoLocal: (evento as any).chegadaNoLocal
  });

  private serializeDashboardData(data: DashboardData): Record<string, any> {
    return {
      ...data,
      lastUpdatedAt: data.lastUpdatedAt ? data.lastUpdatedAt.toISOString() : null,
      eventosHojeLista: data.eventosHojeLista.map(evento => ({
        ...evento,
        dataEvento: evento.dataEvento.toISOString()
      })),
      eventosProximos: data.eventosProximos.map(evento => ({
        ...evento,
        dataEvento: evento.dataEvento.toISOString()
      })),
      periodosResumo: data.periodosResumo?.map(periodo => ({
        ...periodo,
        inicio: periodo.inicio.toISOString(),
        fim: periodo.fim.toISOString()
      }))
    };
  }

  private deserializeDashboardData(payload: Record<string, any>, dataGeracao?: Date): DashboardData {
    return {
      ...payload,
      lastUpdatedAt: dataGeracao || (payload.lastUpdatedAt ? new Date(payload.lastUpdatedAt) : undefined),
      eventosHojeLista: (payload.eventosHojeLista || []).map((evento: any) => ({
        ...evento,
        dataEvento: new Date(evento.dataEvento)
      })),
      eventosProximos: (payload.eventosProximos || []).map((evento: any) => ({
        ...evento,
        dataEvento: new Date(evento.dataEvento)
      })),
      periodosResumo: (payload.periodosResumo || []).map((periodo: any) => ({
        ...periodo,
        inicio: new Date(periodo.inicio),
        fim: new Date(periodo.fim)
      }))
    } as DashboardData;
  }
}

