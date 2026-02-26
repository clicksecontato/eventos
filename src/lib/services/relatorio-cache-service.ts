import { repositoryFactory } from '../repositories/repository-factory';
import { RelatorioSnapshot, ResumoGeral, ReceitaMensal, EventoResumo, FluxoCaixaMensal, ServicosResumo, CanalEntradaResumo, ImpressoesResumo, PerformanceEvento } from '@/types/relatorios';
import { dataService } from '../data-service';
import { format } from 'date-fns';
import { eachMonthOfInterval, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { filtrarEventosValidos } from '../utils/evento-filters';

export class RelatorioCacheService {
  private repository = repositoryFactory.getRelatorioCacheRepository();

  /**
   * Gera um snapshot completo de relatórios para um usuário
   * Este método busca todos os dados e calcula todas as agregações em memória
   */
  async gerarSnapshotCompleto(userId: string): Promise<RelatorioSnapshot> {
    console.log(`[RelatorioCacheService] Iniciando geração de snapshot para usuário ${userId}`);

    const inicioProcessamento = Date.now();

    try {
      // Buscar todos os dados de uma vez (múltiplas queries, mas uma por collection)
      const [
        eventos,
        pagamentos,
        custos,
        servicos,
        clientes,
        canaisEntrada,
        tiposServicos,
        tiposCustos
      ] = await Promise.all([
        dataService.getAllEventos(userId),
        dataService.getAllPagamentos(userId),
        dataService.getAllCustos(userId),
        dataService.getAllServicos(userId),
        dataService.getAllClientes(userId),
        dataService.getCanaisEntradaAtivos(userId),
        dataService.getTiposServicos(userId),
        dataService.getTiposCusto(userId)
      ]);

      console.log(`[RelatorioCacheService] Dados carregados: ${eventos.length} eventos, ${pagamentos.length} pagamentos, ${custos.length} custos, ${servicos.length} serviços`);

      const agora = new Date();
      const inicioAno = new Date(agora.getFullYear(), 0, 1);
      const fimAno = new Date(agora.getFullYear(), 11, 31, 23, 59, 59, 999);

      // Calcular todas as agregações
      const resumoGeral = this.calcularResumoGeral(eventos, pagamentos, custos, clientes);
      const receitaMensal = this.calcularReceitaMensal(pagamentos, 24); // Últimos 24 meses
      const eventosResumo = await this.calcularEventosResumo(userId, eventos, pagamentos, custos, servicos);
      const fluxoCaixa = this.calcularFluxoCaixa(pagamentos, custos, 24); // Últimos 24 meses
      const servicosResumo = this.calcularServicosResumo(eventos, servicos, tiposServicos);
      const canaisEntradaResumo = this.calcularCanaisEntradaResumo(clientes, eventos, canaisEntrada);
      const impressoesResumo = this.calcularImpressoesResumo(eventos);
      
      // Aguardar eventosResumo antes de calcular performance
      const eventosResumoCalculados = await eventosResumo;
      const performanceEventos = this.calcularPerformanceEventos(eventosResumoCalculados);

      const snapshot: RelatorioSnapshot = {
        userId,
        dataGeracao: agora,
        periodo: {
          inicio: inicioAno,
          fim: fimAno
        },
        resumoGeral,
        receitaMensal,
        eventosResumo: eventosResumoCalculados,
        fluxoCaixa,
        servicosResumo,
        canaisEntradaResumo,
        impressoesResumo,
        performanceEventos
      };

      // Salvar snapshot
      await this.repository.createOrUpdateSnapshot(userId, snapshot);

      const tempoProcessamento = Date.now() - inicioProcessamento;
      console.log(`[RelatorioCacheService] Snapshot gerado com sucesso em ${tempoProcessamento}ms`);

      return snapshot;
    } catch (error) {
      console.error('[RelatorioCacheService] Erro ao gerar snapshot:', error);
      throw error;
    }
  }

  /**
   * Busca o snapshot mais recente ou gera um novo se não existir
   */
  async getOrGenerateSnapshot(userId: string): Promise<RelatorioSnapshot> {
    const snapshot = await this.repository.getLatestSnapshot(userId);
    
    if (snapshot) {
      const hoje = new Date();
      const snapshotDate = new Date(snapshot.dataGeracao);
      
      // Se snapshot foi gerado hoje, retornar
      if (snapshotDate.toDateString() === hoje.toDateString()) {
        return snapshot;
      }
    }

    // Gerar novo snapshot se não existe ou está desatualizado
    return this.gerarSnapshotCompleto(userId);
  }

  /**
   * Calcula resumo geral
   */
  private calcularResumoGeral(
    eventos: any[],
    pagamentos: any[],
    custos: any[],
    clientes: any[]
  ): ResumoGeral {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosAtivos = filtrarEventosValidos(eventos);
    const pagamentosPagos = pagamentos.filter(p => p.status === 'Pago' && !p.cancelado);
    const custosAtivos = custos.filter(c => !c.removido);
    const clientesAtivos = clientes.filter(c => !c.arquivado);

    const receitaTotal = pagamentosPagos.reduce((sum, p) => sum + p.valor, 0);
    const custosTotal = custosAtivos.reduce((sum, c) => sum + (c.valor * (c.quantidade || 1)), 0);
    const lucroTotal = receitaTotal - custosTotal;

    return {
      totalEventos: eventosAtivos.length,
      totalClientes: clientesAtivos.length,
      receitaTotal,
      custosTotal,
      lucroTotal,
      receitaMedia: eventosAtivos.length > 0 ? receitaTotal / eventosAtivos.length : 0,
      custoMedio: custosAtivos.length > 0 ? custosTotal / custosAtivos.length : 0,
      margemLucro: receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0
    };
  }

  /**
   * Calcula receita mensal dos últimos N meses
   */
  private calcularReceitaMensal(pagamentos: any[], meses: number): ReceitaMensal[] {
    const hoje = new Date();
    const inicio = startOfMonth(subMonths(hoje, meses - 1));
    const fim = endOfMonth(hoje);

    const mesesInterval = eachMonthOfInterval({ start: inicio, end: fim });

    const pagamentosPagos = pagamentos.filter(p => p.status === 'Pago' && !p.cancelado);

    return mesesInterval.map(mes => {
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      const pagamentosDoMes = pagamentosPagos.filter(p => {
        const dataPag = new Date(p.dataPagamento);
        return dataPag >= inicioMes && dataPag <= fimMes;
      });

      const valor = pagamentosDoMes.reduce((sum, p) => sum + p.valor, 0);
      const valores = pagamentosDoMes.map(p => p.valor);
      const maiorPagamento = valores.length > 0 ? Math.max(...valores) : 0;
      const menorPagamento = valores.length > 0 ? Math.min(...valores) : 0;

      return {
        mes: format(mes, 'yyyy-MM'),
        valor,
        quantidadePagamentos: pagamentosDoMes.length,
        receitaMedia: pagamentosDoMes.length > 0 ? valor / pagamentosDoMes.length : 0,
        maiorPagamento,
        menorPagamento
      };
    });
  }

  /**
   * Calcula resumo financeiro de cada evento
   * Otimizado para usar collections globais de pagamentos e custos
   */
  private async calcularEventosResumo(
    userId: string,
    eventos: any[],
    pagamentos: any[],
    custos: any[],
    servicos: any[]
  ): Promise<EventoResumo[]> {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosAtivos = filtrarEventosValidos(eventos);
    const hoje = new Date();

    // Criar mapas para lookup rápido
    const servicosPorEvento = new Map<string, any[]>();
    servicos.forEach(servico => {
      const eventoId = servico.eventoId || servico.evento?.id;
      if (eventoId) {
        if (!servicosPorEvento.has(eventoId)) {
          servicosPorEvento.set(eventoId, []);
        }
        servicosPorEvento.get(eventoId)!.push(servico);
      }
    });

    // Processar todos os eventos sem queries adicionais
    return eventosAtivos.map((evento) => {
      // Pagamentos do evento (usando dados já carregados)
      const pagamentosEvento = pagamentos.filter(p => {
        const eventoId = p.eventoId || p.evento?.id;
        return eventoId === evento.id && !p.cancelado;
      });
      const totalPago = pagamentosEvento
        .filter(p => p.status === 'Pago')
        .reduce((sum, p) => sum + p.valor, 0);

      const valorTotal = evento.valorTotal || 0;
      const valorPendente = valorTotal - totalPago;

      // Custos do evento (usando dados já carregados da collection global)
      const custosEvento = custos.filter(c => {
        const eventoId = c.eventoId || c.evento?.id;
        return eventoId === evento.id && !c.removido;
      });
      const custosTotal = custosEvento.reduce((sum, c) => sum + (c.valor * (c.quantidade || 1)), 0);

      // Serviços do evento (usando dados já carregados)
      const servicosEvento = servicosPorEvento.get(evento.id) || [];
      const servicosAtivos = servicosEvento.filter(s => !s.removido);
      const servicosTotal = servicosAtivos.length; // Quantidade de serviços

      // Verificar se está atrasado
      const dataFinalPagamento = evento.diaFinalPagamento ? new Date(evento.diaFinalPagamento) : null;
      const isAtrasado = dataFinalPagamento ? (hoje > dataFinalPagamento && valorPendente > 0) : false;
      const valorAtrasado = isAtrasado ? valorPendente : 0;

      const lucro = valorTotal - custosTotal - servicosTotal;
      const margemLucro = valorTotal > 0 ? (lucro / valorTotal) * 100 : 0;

      return {
        eventoId: evento.id,
        clienteId: evento.clienteId || evento.cliente?.id || '',
        clienteNome: evento.cliente?.nome || 'Cliente não identificado',
        dataEvento: new Date(evento.dataEvento),
        tipoEvento: evento.tipoEvento || '',
        valorTotal,
        totalPago,
        valorPendente: isAtrasado ? 0 : valorPendente,
        valorAtrasado,
        quantidadePagamentos: pagamentosEvento.length,
        custosTotal,
        servicosTotal,
        lucro,
        margemLucro,
        isAtrasado
      };
    });
  }

  /**
   * Calcula fluxo de caixa mensal
   */
  private calcularFluxoCaixa(pagamentos: any[], custos: any[], meses: number): FluxoCaixaMensal[] {
    const hoje = new Date();
    const inicio = startOfMonth(subMonths(hoje, meses - 1));
    const fim = endOfMonth(hoje);

    const mesesInterval = eachMonthOfInterval({ start: inicio, end: fim });

    const pagamentosPagos = pagamentos.filter(p => p.status === 'Pago' && !p.cancelado);
    const custosAtivos = custos.filter(c => !c.removido);

    const fluxoMensal: FluxoCaixaMensal[] = [];
    let saldoAcumulado = 0;

    mesesInterval.forEach(mes => {
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      // Receitas do mês
      const pagamentosDoMes = pagamentosPagos.filter(p => {
        const dataPag = new Date(p.dataPagamento);
        return dataPag >= inicioMes && dataPag <= fimMes;
      });

      const receitas = pagamentosDoMes.reduce((sum, p) => sum + p.valor, 0);
      const receitasPorForma: Record<string, number> = {};
      pagamentosDoMes.forEach(p => {
        receitasPorForma[p.formaPagamento] = (receitasPorForma[p.formaPagamento] || 0) + p.valor;
      });

      // Despesas do mês
      const custosDoMes = custosAtivos.filter(c => {
        const dataCusto = new Date(c.dataCadastro);
        return dataCusto >= inicioMes && dataCusto <= fimMes;
      });

      const despesas = custosDoMes.reduce((sum, c) => sum + (c.valor * (c.quantidade || 1)), 0);
      const despesasPorCategoria: Record<string, number> = {};
      custosDoMes.forEach(c => {
        const categoria = c.tipoCusto?.nome || 'Sem categoria';
        despesasPorCategoria[categoria] = (despesasPorCategoria[categoria] || 0) + (c.valor * (c.quantidade || 1));
      });

      const saldo = receitas - despesas;
      saldoAcumulado += saldo;

      fluxoMensal.push({
        mes: format(mes, 'yyyy-MM'),
        receitas,
        despesas,
        saldo,
        saldoAcumulado,
        receitasPorForma,
        despesasPorCategoria
      });
    });

    return fluxoMensal;
  }

  /**
   * Calcula resumo de serviços
   */
  private calcularServicosResumo(eventos: any[], servicos: any[], tiposServicos: any[]): ServicosResumo {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosAtivos = filtrarEventosValidos(eventos);
    const servicosAtivos = servicos.filter(s => !s.removido);

    const tiposMap = new Map(tiposServicos.map(t => [t.id, t]));

    const servicosPorTipo: Record<string, { quantidade: number; eventos: Set<string> }> = {};

    servicosAtivos.forEach(servico => {
      const tipoNome = tiposMap.get(servico.tipoServicoId)?.nome || 'Tipo não encontrado';
      if (!servicosPorTipo[tipoNome]) {
        servicosPorTipo[tipoNome] = { quantidade: 0, eventos: new Set() };
      }
      servicosPorTipo[tipoNome].quantidade++;
      servicosPorTipo[tipoNome].eventos.add(servico.eventoId);
    });

    const totalServicos = servicosAtivos.length; // Mantido apenas para cálculo de percentuais

    const servicosPorTipoArray = Object.entries(servicosPorTipo).map(([nome, dados]) => ({
      tipoServicoId: tiposServicos.find(t => t.nome === nome)?.id || '',
      tipoServicoNome: nome,
      quantidade: dados.quantidade,
      eventosUtilizados: dados.eventos.size,
      percentual: totalServicos > 0 ? (dados.quantidade / totalServicos) * 100 : 0
    }));

    return {
      servicosPorTipo: servicosPorTipoArray
    };
  }

  /**
   * Calcula resumo de canais de entrada
   */
  private calcularCanaisEntradaResumo(clientes: any[], eventos: any[], canaisEntrada: any[]): CanalEntradaResumo[] {
    const clientesAtivos = clientes.filter(c => !c.arquivado);
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosAtivos = filtrarEventosValidos(eventos);

    const canaisMap = new Map(canaisEntrada.map(c => [c.id, c]));

    const resumoPorCanal: Record<string, {
      quantidadeLeads: number;
      quantidadeEventos: number;
      receitaTotal: number;
    }> = {};

    clientesAtivos.forEach(cliente => {
      const canalId = cliente.canalEntradaId;
      if (!canalId) return;

      if (!resumoPorCanal[canalId]) {
        resumoPorCanal[canalId] = {
          quantidadeLeads: 0,
          quantidadeEventos: 0,
          receitaTotal: 0
        };
      }

      resumoPorCanal[canalId].quantidadeLeads++;

      // Buscar eventos deste cliente
      const eventosCliente = eventosAtivos.filter(e => e.clienteId === cliente.id);
      resumoPorCanal[canalId].quantidadeEventos += eventosCliente.length;
      resumoPorCanal[canalId].receitaTotal += eventosCliente.reduce((sum, e) => sum + (e.valorTotal || 0), 0);
    });

    return Object.entries(resumoPorCanal).map(([canalId, dados]) => {
      const canal = canaisMap.get(canalId);
      const ticketMedio = dados.quantidadeEventos > 0 ? dados.receitaTotal / dados.quantidadeEventos : 0;
      const taxaConversao = dados.quantidadeLeads > 0 ? (dados.quantidadeEventos / dados.quantidadeLeads) * 100 : 0;

      return {
        canalEntradaId: canalId,
        canalEntradaNome: canal?.nome || 'Canal não encontrado',
        quantidadeLeads: dados.quantidadeLeads,
        quantidadeEventos: dados.quantidadeEventos,
        receitaTotal: dados.receitaTotal,
        taxaConversao,
        ticketMedio
      };
    });
  }

  /**
   * Calcula resumo de impressões
   */
  private calcularImpressoesResumo(eventos: any[]): ImpressoesResumo {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosAtivos = filtrarEventosValidos(eventos);

    const totalImpressoes = eventosAtivos.reduce((sum, e) => sum + (e.numeroImpressoes || 0), 0);
    const eventosComImpressoes = eventosAtivos.filter(e => (e.numeroImpressoes || 0) > 0).length;
    const eventosSemImpressoes = eventosAtivos.length - eventosComImpressoes;
    const taxaUtilizacaoImpressoes = eventosAtivos.length > 0 ? (eventosComImpressoes / eventosAtivos.length) * 100 : 0;

    const custoPorImpressao = 0.50; // R$ 0,50 por impressão
    const custoTotal = totalImpressoes * custoPorImpressao;

    const impressoesPorTipo: Record<string, number> = {};
    eventosAtivos.forEach(evento => {
      const tipo = evento.tipoEvento || 'Sem tipo';
      impressoesPorTipo[tipo] = (impressoesPorTipo[tipo] || 0) + (evento.numeroImpressoes || 0);
    });

    const impressoesPorTipoArray = Object.entries(impressoesPorTipo).map(([tipo, quantidade]) => ({
      tipoEvento: tipo,
      quantidade,
      percentual: totalImpressoes > 0 ? (quantidade / totalImpressoes) * 100 : 0
    }));

    return {
      totalImpressoes,
      eventosComImpressoes,
      eventosSemImpressoes,
      taxaUtilizacaoImpressoes,
      custoTotal,
      impressoesPorTipo: impressoesPorTipoArray
    };
  }

  /**
   * Calcula performance dos eventos (baseado em eventosResumo)
   */
  private calcularPerformanceEventos(eventosResumo: EventoResumo[]): PerformanceEvento[] {
    return eventosResumo.map(evento => ({
      eventoId: evento.eventoId,
      nomeEvento: `${evento.clienteNome} - ${evento.tipoEvento}`,
      clienteNome: evento.clienteNome,
      dataEvento: evento.dataEvento,
      tipoEvento: evento.tipoEvento,
      valorTotal: evento.valorTotal,
      custosTotal: evento.custosTotal,
      servicosTotal: evento.servicosTotal,
      lucro: evento.lucro,
      margemLucro: evento.margemLucro,
      status: evento.isAtrasado ? 'Atrasado' : (evento.valorPendente > 0 ? 'Pendente' : 'Pago'),
      totalPago: evento.totalPago,
      valorPendente: evento.valorPendente
    }));
  }
}

