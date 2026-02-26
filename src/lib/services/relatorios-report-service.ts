import { format } from 'date-fns';
import { repositoryFactory } from '../repositories/repository-factory';
import { RelatorioPersistido } from '../repositories/relatorios-diarios-repository';
import {
  Evento,
  Pagamento,
  CustoEvento,
  ServicoEvento,
  TipoServico,
  Cliente,
  CanalEntrada
} from '@/types';
import { dataService } from '../data-service';
import { startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { filtrarEventosValidos, filtrarEventosValidosComValor } from '../utils/evento-filters';

export class RelatoriosReportService {
  private static instance: RelatoriosReportService;

  private eventoRepo = repositoryFactory.getEventoRepository();
  private pagamentoRepo = repositoryFactory.getPagamentoRepository();
  private custoEventoRepo = repositoryFactory.getCustoEventoRepository();
  private servicoEventoRepo = repositoryFactory.getServicoEventoRepository();
  private tipoServicoRepo = repositoryFactory.getTipoServicoRepository();
  private tipoCustoRepo = repositoryFactory.getTipoCustoRepository();
  private clienteRepo = repositoryFactory.getClienteRepository();
  private canalEntradaRepo = repositoryFactory.getCanalEntradaRepository();
  private relatoriosRepo = repositoryFactory.getRelatoriosDiariosRepository();

  static getInstance(): RelatoriosReportService {
    if (!RelatoriosReportService.instance) {
      RelatoriosReportService.instance = new RelatoriosReportService();
    }
    return RelatoriosReportService.instance;
  }

  async gerarTodosRelatorios(userId: string, options?: { forceRefresh?: boolean }): Promise<void> {
    if (!userId) {
      throw new Error('userId é obrigatório para gerar relatórios');
    }

    const hoje = new Date();
    const dateKey = format(hoje, 'yyyyMMdd');

    try {
      if (!options?.forceRefresh) {
        const cached = await this.relatoriosRepo.getRelatorioDiario(userId, dateKey);
        if (cached && this.todosRelatoriosPresentes(cached)) {
          return; // Todos os relatórios já estão em cache
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar cache de relatórios:', error);
      // Continuar mesmo se houver erro ao verificar cache
    }

    // Removido initializeAllCollections() - não é necessário e causa queries desnecessárias de subcollections

    // Buscar todos os dados necessários uma única vez
    let eventos, pagamentos, todosCustos, todosServicos, tiposServicos, tiposCusto, clientes, canaisEntrada;
    
    try {
      [eventos, pagamentos, todosCustos, todosServicos, tiposServicos, tiposCusto, clientes, canaisEntrada] = await Promise.all([
        this.eventoRepo.findAll(userId),
        this.pagamentoRepo.findAll(userId),
        this.custoEventoRepo.findAll(userId),
        this.servicoEventoRepo.findAll(userId),
        this.tipoServicoRepo.findAll(userId),
        this.tipoCustoRepo.findAll(userId),
        this.clienteRepo.findAll(userId),
        this.canalEntradaRepo.findAll(userId)
      ]);
    } catch (error: any) {
      console.error('Erro ao buscar dados para gerar relatórios:', error);
      throw new Error(`Erro ao buscar dados: ${error?.message || 'Erro desconhecido ao buscar dados'}`);
    }

    // Enriquecer custos e serviços com tipos
    const tiposCustoMap = new Map(tiposCusto.map(tipo => [tipo.id, tipo]));
    const custos = todosCustos.map(custo => ({
      ...custo,
      tipoCusto: tiposCustoMap.get(custo.tipoCustoId) || {
        id: custo.tipoCustoId,
        nome: 'Tipo não encontrado',
        descricao: '',
        ativo: false,
        dataCadastro: new Date()
      }
    }));

    const tiposServicosMap = new Map(tiposServicos.map(tipo => [tipo.id, tipo]));
    const servicos = todosServicos.map(servico => ({
      ...servico,
      tipoServico: tiposServicosMap.get(servico.tipoServicoId) || {
        id: servico.tipoServicoId,
        nome: 'Tipo não encontrado',
        descricao: '',
        ativo: false,
        dataCadastro: new Date()
      }
    }));

    // Gerar todos os relatórios em paralelo
    let detalhamentoReceber, receitaMensal, performanceEventos, fluxoCaixa, servicosReport, canaisEntradaReport, impressoes;
    
    try {
      [
        detalhamentoReceber,
        receitaMensal,
        performanceEventos,
        fluxoCaixa,
        servicosReport,
        canaisEntradaReport,
        impressoes
      ] = await Promise.all([
        this.gerarDetalhamentoReceber(eventos, pagamentos),
        this.gerarReceitaMensal(pagamentos),
        this.gerarPerformanceEventos(eventos),
        this.gerarFluxoCaixa(pagamentos, custos),
        this.gerarServicos(eventos, servicos, tiposServicos),
        this.gerarCanaisEntrada(clientes, canaisEntrada, eventos),
        this.gerarImpressoes(eventos)
      ]);
    } catch (error: any) {
      console.error('Erro ao gerar relatórios:', error);
      throw new Error(`Erro ao gerar relatórios: ${error?.message || 'Erro desconhecido ao gerar relatórios'}`);
    }

    // Salvar todos os relatórios de uma vez
    try {
      await this.relatoriosRepo.salvarMultiplosRelatorios(
        userId,
        dateKey,
        {
          detalhamentoReceber,
          receitaMensal,
          performanceEventos,
          fluxoCaixa,
          servicos: servicosReport,
          canaisEntrada: canaisEntradaReport,
          impressoes
        },
        hoje
      );
    } catch (error: any) {
      console.error('Erro ao salvar relatórios:', error);
      throw new Error(`Erro ao salvar relatórios: ${error?.message || 'Erro desconhecido ao salvar relatórios'}`);
    }
  }

  private todosRelatoriosPresentes(cached: any): boolean {
    return !!(
      cached.detalhamentoReceber &&
      cached.receitaMensal &&
      cached.performanceEventos &&
      cached.fluxoCaixa &&
      cached.servicos &&
      cached.canaisEntrada &&
      cached.impressoes
    );
  }

  private async gerarDetalhamentoReceber(eventos: Evento[], pagamentos: Pagamento[]): Promise<RelatorioPersistido> {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidosComValor = filtrarEventosValidosComValor(eventos);
    
    const resumosPorEvento: Record<string, {
      totalPago: number;
      valorPendente: number;
      valorAtrasado: number;
      quantidadePagamentos: number;
      isAtrasado: boolean;
    }> = {};

    eventosValidosComValor.forEach(evento => {
      const valorPrevisto = evento.valorTotal || 0;
      if (valorPrevisto <= 0) return;

      const resumo = dataService.calcularResumoFinanceiroPorEvento(
        evento.id,
        valorPrevisto,
        pagamentos,
        evento.diaFinalPagamento ? new Date(evento.diaFinalPagamento) : undefined
      );

      resumosPorEvento[evento.id] = resumo;
    });

    const resumosPorCliente: Record<string, {
      clienteId: string;
      clienteNome: string;
      totalPendente: number;
      totalAtrasado: number;
      totalReceber: number;
      eventos: Array<{
        eventoId: string;
        nomeEvento: string;
        dataEvento?: string;
        dataFinalPagamento?: string;
        valorPrevisto: number;
        valorPago: number;
        valorPendente: number;
        valorAtrasado: number;
      }>;
    }> = {};

    eventosValidosComValor.forEach(evento => {
      const resumo = resumosPorEvento[evento.id];
      if (!resumo || (resumo.valorPendente === 0 && resumo.valorAtrasado === 0)) return;

      const clienteId = evento.clienteId || '';
      const clienteNome = evento.cliente?.nome || 'Cliente sem nome';

      if (!resumosPorCliente[clienteId]) {
        resumosPorCliente[clienteId] = {
          clienteId,
          clienteNome,
          totalPendente: 0,
          totalAtrasado: 0,
          totalReceber: 0,
          eventos: []
        };
      }

      resumosPorCliente[clienteId].totalPendente += resumo.valorPendente;
      resumosPorCliente[clienteId].totalAtrasado += resumo.valorAtrasado;
      resumosPorCliente[clienteId].totalReceber += resumo.valorPendente + resumo.valorAtrasado;

      resumosPorCliente[clienteId].eventos.push({
        eventoId: evento.id,
        nomeEvento: clienteNome,
        dataEvento: evento.dataEvento ? new Date(evento.dataEvento).toISOString() : undefined,
        dataFinalPagamento: evento.diaFinalPagamento ? new Date(evento.diaFinalPagamento).toISOString() : undefined,
        valorPrevisto: evento.valorTotal || 0,
        valorPago: resumo.totalPago,
        valorPendente: resumo.valorPendente,
        valorAtrasado: resumo.valorAtrasado
      });
    });

    return {
      data: {
        resumosPorCliente: Object.values(resumosPorCliente),
        resumosPorEvento
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalEventos: eventosValidosComValor.length,
        totalPagamentos: pagamentos.length
      }
    };
  }

  private async gerarReceitaMensal(pagamentos: Pagamento[]): Promise<RelatorioPersistido> {
    const hoje = new Date();
    const inicio = startOfMonth(subMonths(hoje, 23));
    const fim = endOfMonth(hoje);

    const meses = eachMonthOfInterval({ start: inicio, end: fim });

    const receitaPorMes = meses.map(mes => {
      const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
      const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0, 23, 59, 59, 999);

      const pagamentosDoMes = pagamentos.filter(pagamento => {
        if (!pagamento.dataPagamento) return false;
        const dataPagamento = new Date(pagamento.dataPagamento);
        return dataPagamento >= inicioMes && dataPagamento <= fimMes && pagamento.status === 'Pago';
      });

      const receitaMes = pagamentosDoMes.reduce((total, p) => total + p.valor, 0);

      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        mesCompleto: format(mes, 'MMMM yyyy', { locale: ptBR }),
        valor: receitaMes,
        data: mes.toISOString()
      };
    });

    const receitaTotal = receitaPorMes.reduce((total, item) => total + item.valor, 0);
    const valores = receitaPorMes.map(r => r.valor);
    const valoresPositivos = valores.filter(v => v > 0);
    const maiorValor = valores.length > 0 ? Math.max(...valores) : 0;
    const menorValor = valoresPositivos.length > 0 ? Math.min(...valoresPositivos) : 0;
    const receitaMedia = receitaPorMes.length > 0 ? receitaTotal / receitaPorMes.length : 0;
    const mesesComReceita = valoresPositivos.length;

    return {
      data: {
        receitaPorMes,
        resumoGeral: {
          receitaTotal,
          receitaMedia,
          maiorValor,
          menorValor,
          mesesComReceita,
          totalMeses: receitaPorMes.length
        }
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalPagamentos: pagamentos.length
      }
    };
  }

  private async gerarPerformanceEventos(eventos: Evento[]): Promise<RelatorioPersistido> {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const total = eventosValidos.length;
    const concluidos = eventosValidos.filter(e => e.status === 'Concluído').length;
    // Cancelados são excluídos dos cálculos, mas podem ser contados separadamente para estatísticas
    const cancelados = eventos.filter(e => e.status === 'Cancelado').length;

    const tipoCount: Record<string, number> = {};
    eventosValidos.forEach(evento => {
      tipoCount[evento.tipoEvento] = (tipoCount[evento.tipoEvento] || 0) + 1;
    });

    const statusCount: Record<string, number> = {};
    eventosValidos.forEach(evento => {
      statusCount[evento.status] = (statusCount[evento.status] || 0) + 1;
    });

    return {
      data: {
        resumoGeral: {
          totalEventos: total,
          eventosConcluidos: concluidos,
          eventosCancelados: cancelados,
          taxaConclusao: total > 0 ? (concluidos / total) * 100 : 0,
          taxaCancelamento: total > 0 ? (cancelados / total) * 100 : 0
        },
        eventosPorTipo: Object.entries(tipoCount).map(([tipo, quantidade]) => ({
          label: tipo,
          value: quantidade,
          percentage: total > 0 ? (quantidade / total) * 100 : 0
        })),
        eventosPorStatus: Object.entries(statusCount).map(([status, quantidade]) => ({
          label: status,
          value: quantidade,
          percentage: total > 0 ? (quantidade / total) * 100 : 0
        }))
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalEventos: total
      }
    };
  }

  private async gerarFluxoCaixa(pagamentos: Pagamento[], custos: CustoEvento[]): Promise<RelatorioPersistido> {
    const hoje = new Date();
    const inicio = subMonths(hoje, 11);
    inicio.setHours(0, 0, 0, 0);
    const fim = new Date(hoje);
    fim.setHours(23, 59, 59, 999);

    const pagamentosPeriodo = pagamentos.filter(p => {
      const dataPag = new Date(p.dataPagamento);
      return dataPag >= inicio && dataPag <= fim && p.status === 'Pago';
    });

    const custosPeriodo = custos.filter(c => {
      if (c.removido) return false;
      if (!c.dataCadastro) return false;
      try {
        const dataCusto = new Date(c.dataCadastro);
        if (isNaN(dataCusto.getTime())) return false;
        return dataCusto >= inicio && dataCusto <= fim;
      } catch {
        return false;
      }
    });

    const receitasPorMes: Record<string, number> = {};
    pagamentosPeriodo.forEach(pagamento => {
      const mes = format(new Date(pagamento.dataPagamento), 'yyyy-MM');
      receitasPorMes[mes] = (receitasPorMes[mes] || 0) + pagamento.valor;
    });

    const despesasPorMes: Record<string, number> = {};
    custosPeriodo.forEach(custo => {
      const mes = format(new Date(custo.dataCadastro), 'yyyy-MM');
      const valorTotal = custo.valor * (custo.quantidade || 1);
      despesasPorMes[mes] = (despesasPorMes[mes] || 0) + valorTotal;
    });

    const meses = eachMonthOfInterval({ start: inicio, end: fim });
    const fluxoMensal = meses.map(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const receitas = receitasPorMes[mesKey] || 0;
      const despesas = despesasPorMes[mesKey] || 0;
      const saldo = receitas - despesas;

      return {
        mes: format(mes, 'MMM/yyyy', { locale: ptBR }),
        ano: mes.getFullYear(),
        receitas,
        despesas,
        saldo,
        saldoAcumulado: 0
      };
    });

    let saldoAcumulado = 0;
    fluxoMensal.forEach(item => {
      saldoAcumulado += item.saldo;
      item.saldoAcumulado = saldoAcumulado;
    });

    const receitasPorForma: Record<string, number> = {};
    pagamentosPeriodo.forEach(pagamento => {
      receitasPorForma[pagamento.formaPagamento] =
        (receitasPorForma[pagamento.formaPagamento] || 0) + pagamento.valor;
    });

    const totalReceitas = Object.values(receitasPorForma).reduce((sum, val) => sum + val, 0);
    const receitasPorFormaPagamento = Object.entries(receitasPorForma).map(([forma, valor]) => ({
      formaPagamento: forma,
      valor,
      percentual: totalReceitas > 0 ? (valor / totalReceitas) * 100 : 0
    }));

    const despesasPorCategoria: Record<string, number> = {};
    custosPeriodo.forEach(custo => {
      const categoria = custo.tipoCusto?.nome || 'Sem categoria';
      const valorTotal = custo.valor * (custo.quantidade || 1);
      despesasPorCategoria[categoria] = (despesasPorCategoria[categoria] || 0) + valorTotal;
    });

    const totalDespesas = Object.values(despesasPorCategoria).reduce((sum, val) => sum + val, 0);
    const despesasPorCategoriaData = Object.entries(despesasPorCategoria).map(([categoria, valor]) => ({
      categoria,
      valor,
      percentual: totalDespesas > 0 ? (valor / totalDespesas) * 100 : 0
    }));

    const receitaTotal = totalReceitas;
    const despesaTotal = totalDespesas;
    const saldoAtual = receitaTotal - despesaTotal;
    const saldoAnterior = fluxoMensal.length > 1 ? fluxoMensal[fluxoMensal.length - 2].saldoAcumulado : 0;
    const variacaoSaldo = saldoAtual - saldoAnterior;
    const percentualVariacao = saldoAnterior !== 0 ? (variacaoSaldo / Math.abs(saldoAnterior)) * 100 : 0;

    const ultimos3Meses = fluxoMensal.slice(-3);
    const mediaReceita = ultimos3Meses.reduce((sum, m) => sum + m.receitas, 0) / ultimos3Meses.length;
    const mediaDespesa = ultimos3Meses.reduce((sum, m) => sum + m.despesas, 0) / ultimos3Meses.length;

    const projecao = [];
    for (let i = 1; i <= 3; i++) {
      const mesProjecao = new Date(hoje);
      mesProjecao.setMonth(hoje.getMonth() + i);
      projecao.push({
        mes: format(mesProjecao, 'MMM/yyyy', { locale: ptBR }),
        receitaProjetada: mediaReceita,
        despesaProjetada: mediaDespesa,
        saldoProjetado: mediaReceita - mediaDespesa
      });
    }

    return {
      data: {
        fluxoMensal,
        receitasPorFormaPagamento,
        despesasPorCategoriaData,
        resumoGeral: {
          receitaTotal,
          despesaTotal,
          saldoAtual,
          variacaoSaldo,
          percentualVariacao
        },
        projecao
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalPagamentos: pagamentos.length,
        totalCustos: custos.length
      }
    };
  }

  private async gerarServicos(eventos: Evento[], servicos: ServicoEvento[], tiposServicos: TipoServico[]): Promise<RelatorioPersistido> {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const servicosPorEvento: Record<string, string[]> = {};
    eventosValidos.forEach(evento => {
      const servicosEvento = servicos.filter(s => s.eventoId === evento.id);
      servicosPorEvento[evento.id] = servicosEvento.map(s => s.tipoServicoId);
    });

    // Filtrar serviços apenas de eventos válidos
    const servicosValidos = servicos.filter(s => {
      const eventoId = s.eventoId;
      return eventosValidos.some(e => e.id === eventoId);
    });

    const servicosPorTipo: Record<string, number> = {};
    servicosValidos.forEach(servico => {
      const tipoId = servico.tipoServicoId;
      servicosPorTipo[tipoId] = (servicosPorTipo[tipoId] || 0) + 1;
    });

    const servicosPorTipoEvento: Record<string, Record<string, number>> = {};
    eventosValidos.forEach(evento => {
      const servicosEvento = servicos.filter(s => s.eventoId === evento.id);
      servicosEvento.forEach(servico => {
        if (!servicosPorTipoEvento[evento.tipoEvento]) {
          servicosPorTipoEvento[evento.tipoEvento] = {};
        }
        const tipoId = servico.tipoServicoId;
        servicosPorTipoEvento[evento.tipoEvento][tipoId] =
          (servicosPorTipoEvento[evento.tipoEvento][tipoId] || 0) + 1;
      });
    });

    const totalServicos = servicos.length; // Mantido apenas para cálculo de percentuais

    return {
      data: {
        servicosPorTipo: Object.entries(servicosPorTipo).map(([tipoId, quantidade]) => {
          const tipo = tiposServicos.find(t => t.id === tipoId);
          return {
            label: tipo?.nome || 'Desconhecido',
            value: quantidade,
            percentage: totalServicos > 0 ? (quantidade / totalServicos) * 100 : 0
          };
        }),
        servicosPorTipoEvento: Object.entries(servicosPorTipoEvento).map(([tipoEvento, servicos]) => ({
          tipoEvento,
          servicos: Object.entries(servicos).map(([tipoId, quantidade]) => {
            const tipo = tiposServicos.find(t => t.id === tipoId);
            return {
              label: tipo?.nome || 'Desconhecido',
              value: quantidade
            };
          })
        }))
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalEventos: eventosValidos.length,
        totalServicos: servicosValidos.length
      }
    };
  }

  private async gerarCanaisEntrada(clientes: Cliente[], canaisEntrada: CanalEntrada[], eventos: Evento[]): Promise<RelatorioPersistido> {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const clientesPorCanal: Record<string, number> = {};
    clientes.forEach(cliente => {
      const canalId = cliente.canalEntradaId || 'sem-canal';
      clientesPorCanal[canalId] = (clientesPorCanal[canalId] || 0) + 1;
    });

    const eventosPorCanal: Record<string, number> = {};
    eventosValidos.forEach(evento => {
      const cliente = clientes.find(c => c.id === evento.clienteId);
      const canalId = cliente?.canalEntradaId || 'sem-canal';
      eventosPorCanal[canalId] = (eventosPorCanal[canalId] || 0) + 1;
    });

    const totalClientes = clientes.length;
    const canaisAtivos = Object.keys(clientesPorCanal).filter(k => k !== 'sem-canal').length;
    const clientesSemCanal = clientesPorCanal['sem-canal'] || 0;
    const taxaPreenchimento = totalClientes > 0 ? ((totalClientes - clientesSemCanal) / totalClientes) * 100 : 0;

    return {
      data: {
        clientesPorCanal: Object.entries(clientesPorCanal).map(([canalId, quantidade]) => {
          const canal = canaisEntrada.find(c => c.id === canalId);
          return {
            label: canal?.nome || 'Sem canal',
            value: quantidade,
            percentage: totalClientes > 0 ? (quantidade / totalClientes) * 100 : 0
          };
        }),
        eventosPorCanal: Object.entries(eventosPorCanal).map(([canalId, quantidade]) => {
          const canal = canaisEntrada.find(c => c.id === canalId);
          return {
            label: canal?.nome || 'Sem canal',
            value: quantidade
          };
        }),
        resumoGeral: {
          totalClientes,
          canaisAtivos,
          clientesSemCanal,
          taxaPreenchimento
        }
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalClientes: clientes.length,
        totalEventos: eventosValidos.length
      }
    };
  }

  private async gerarImpressoes(eventos: Evento[]): Promise<RelatorioPersistido> {
    // Filtrar apenas eventos válidos (não cancelados e não arquivados) para cálculos
    const eventosValidos = filtrarEventosValidos(eventos);
    
    const eventosComImpressoes = eventosValidos.filter(e => (e.numeroImpressoes || 0) > 0);
    const totalImpressoes = eventosValidos.reduce((total, e) => total + (e.numeroImpressoes || 0), 0);
    const taxaUtilizacao = eventosValidos.length > 0 ? (eventosComImpressoes.length / eventosValidos.length) * 100 : 0;

    const impressoesPorTipoEvento: Record<string, number> = {};
    eventosValidos.forEach(evento => {
      const impressoes = evento.numeroImpressoes || 0;
      if (impressoes > 0) {
        impressoesPorTipoEvento[evento.tipoEvento] =
          (impressoesPorTipoEvento[evento.tipoEvento] || 0) + impressoes;
      }
    });

    const hoje = new Date();
    const inicio = subMonths(hoje, 11);
    const meses = eachMonthOfInterval({ start: inicio, end: hoje });
    const impressoesPorMes: Record<string, number> = {};

    meses.forEach(mes => {
      const mesKey = format(mes, 'yyyy-MM');
      const eventosMes = eventosValidos.filter(e => {
        const dataEvento = new Date(e.dataEvento);
        return format(dataEvento, 'yyyy-MM') === mesKey;
      });
      impressoesPorMes[mesKey] = eventosMes.reduce((total, e) => total + (e.numeroImpressoes || 0), 0);
    });

    return {
      data: {
        resumoGeral: {
          totalImpressoes,
          eventosComImpressoes: eventosComImpressoes.length,
          taxaUtilizacao
        },
        impressoesPorTipoEvento: Object.entries(impressoesPorTipoEvento).map(([tipo, quantidade]) => ({
          label: tipo,
          value: quantidade
        })),
        impressoesPorMes: Object.entries(impressoesPorMes).map(([mes, quantidade]) => ({
          mes: format(new Date(mes + '-01'), 'MMM/yyyy', { locale: ptBR }),
          quantidade
        }))
      },
      meta: {
        geradoEm: new Date().toISOString(),
        totalEventos: eventosValidos.length
      }
    };
  }

  async getRelatorioCacheado(
    userId: string,
    tipoRelatorio: 'detalhamentoReceber' | 'receitaMensal' | 'performanceEventos' | 'fluxoCaixa' | 'servicos' | 'canaisEntrada' | 'impressoes'
  ): Promise<RelatorioPersistido | null> {
    const hoje = new Date();
    const dateKey = format(hoje, 'yyyyMMdd');
    const cached = await this.relatoriosRepo.getRelatorioDiario(userId, dateKey);
    return cached?.[tipoRelatorio] || null;
  }
}

