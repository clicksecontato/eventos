import { NextRequest, NextResponse } from 'next/server';
import { DataService } from '@/lib/data-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { Evento, Cliente, TipoServico, TipoCusto, TipoEvento, CustoEvento, ServicoEvento, Pagamento } from '@/types';

const dataService = new DataService();
const userRepo = repositoryFactory.getUserRepository();
const eventoRepo = repositoryFactory.getEventoRepository();
const servicoEventoRepo = repositoryFactory.getServicoEventoRepository();
const custoEventoRepo = repositoryFactory.getCustoEventoRepository();
const pagamentoRepo = repositoryFactory.getPagamentoRepository();

const STATUS_EVENTOS: Evento['status'][] = ['Agendado', 'Confirmado', 'Em andamento', 'Concluído', 'Cancelado'];
const FORMAS_PAGAMENTO: Pagamento['formaPagamento'][] = ['Dinheiro', 'Cartão de crédito', 'Depósito bancário', 'PIX', 'Transferência'];
const STATUS_PAGAMENTO: Pagamento['status'][] = ['Pago', 'Pendente'];

const LOCAIS = [
  'Salão de Festas Jardim', 'Salão Águas Claras', 'Buffet Espaço Nobre',
  'Centro de Eventos Horizonte', 'Salão Primavera', 'Espaço Festa & Cia',
  'Centro de Convenções', 'Casa de Eventos Solar', 'Salão Vip Eventos'
];

const ENDERECOS = [
  'Rua das Flores, 123 - Centro', 'Av. Principal, 456 - Jardim América',
  'Rua da Paz, 789 - Vila Nova', 'Av. Central, 321 - Bairro Novo',
  'Rua Comercial, 654 - Centro', 'Av. dos Anjos, 987 - Alto da Colina'
];

const NOMES_EVENTOS = [
  'Casamento Maria e João', '15 Anos da Ana', 'Aniversário do Pedro',
  'Bodas de Prata Silva', 'Formatura Medicina', 'Casamento Silva',
  'Debutante Juliana', 'Aniversário 50 anos', 'Casamento Santos',
  '15 Anos da Beatriz', 'Formatura Direito', 'Casamento Almeida'
];

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function getDiaSemana(data: Date): string {
  const dias = ['DOMINGO', 'SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO'];
  return dias[data.getDay()];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, quantidadeEventos, custos, pagamento } = body;

    if (!email || !quantidadeEventos) {
      return NextResponse.json(
        { error: 'email e quantidadeEventos são obrigatórios' },
        { status: 400 }
      );
    }

    if (quantidadeEventos < 1 || quantidadeEventos > 1000) {
      return NextResponse.json(
        { error: 'quantidadeEventos deve ser entre 1 e 1000' },
        { status: 400 }
      );
    }

    // Buscar usuário por email
    const user = await userRepo.findByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    const userId = user.id;

    // Buscar dados necessários
    const clientes = await dataService.getClientes(userId);
    if (clientes.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não possui clientes cadastrados' },
        { status: 400 }
      );
    }

    const tiposServico = await dataService.getTiposServicoAtivos(userId);
    if (tiposServico.length < 2) {
      return NextResponse.json(
        { error: 'Usuário precisa ter pelo menos 2 tipos de serviço cadastrados' },
        { status: 400 }
      );
    }

    const tiposCusto = await dataService.getTiposCustoAtivos(userId);
    const tiposEvento = await dataService.getTiposEventoAtivos(userId);

    if (tiposEvento.length === 0) {
      return NextResponse.json(
        { error: 'Usuário não possui tipos de evento cadastrados' },
        { status: 400 }
      );
    }

    const eventosCriados = [];
    const hoje = new Date();
    const inicioPeriodo = new Date(hoje);
    inicioPeriodo.setMonth(hoje.getMonth() - 6);
    const fimPeriodo = new Date(hoje);
    fimPeriodo.setMonth(hoje.getMonth() + 12);

    for (let i = 0; i < quantidadeEventos; i++) {
      // Selecionar cliente aleatório
      const cliente = getRandomElement(clientes);

      // Selecionar tipo de evento aleatório
      const tipoEvento = getRandomElement(tiposEvento);

      // Gerar data aleatória
      const dataEvento = getRandomDate(inicioPeriodo, fimPeriodo);
      const diaSemana = getDiaSemana(dataEvento);

      // Gerar valores aleatórios
      const valorTotal = getRandomInt(2000, 15000);
      const numeroConvidados = getRandomInt(50, 500);
      const quantidadeMesas = Math.ceil(numeroConvidados / 10);
      const numeroImpressoes = getRandomInt(100, 2000);

      // Criar evento
      const eventoData: Omit<Evento, 'id' | 'dataCadastro' | 'dataAtualizacao'> = {
        nomeEvento: getRandomElement(NOMES_EVENTOS),
        clienteId: cliente.id,
        cliente: cliente,
        dataEvento: dataEvento,
        diaSemana: diaSemana,
        local: getRandomElement(LOCAIS),
        endereco: getRandomElement(ENDERECOS),
        tipoEvento: tipoEvento.nome,
        tipoEventoId: tipoEvento.id,
        saida: `${getRandomInt(6, 8)}:00`,
        chegadaNoLocal: `${getRandomInt(13, 15)}:00`,
        horarioInicio: `${getRandomInt(16, 18)}:00`,
        horarioDesmontagem: `${getRandomInt(23, 1)}:00`,
        tempoEvento: `${getRandomInt(6, 10)} horas`,
        contratante: cliente.nome,
        numeroConvidados: numeroConvidados,
        quantidadeMesas: quantidadeMesas,
        hashtag: `#evento${getRandomInt(1000, 9999)}`,
        numeroImpressoes: numeroImpressoes,
        cerimonialista: {
          nome: `Cerimonialista ${getRandomElement(['Ana', 'Maria', 'João', 'Pedro'])}`,
          telefone: `(11) 9${getRandomInt(1000, 9999)}-${getRandomInt(1000, 9999)}`
        },
        observacoes: `Evento gerado automaticamente para testes - ${new Date().toISOString()}`,
        status: getRandomElement(STATUS_EVENTOS),
        valorTotal: valorTotal,
        diaFinalPagamento: new Date(dataEvento.getTime() + (getRandomInt(7, 30) * 24 * 60 * 60 * 1000)),
        arquivado: false
      };

      // Criar evento usando repositório diretamente (ignora validações de plano)
      const evento = await eventoRepo.createEvento(eventoData, userId);
      eventosCriados.push(evento);

      // Adicionar 2 serviços aleatórios
      const servicosSelecionados = new Set<string>();
      while (servicosSelecionados.size < 2 && servicosSelecionados.size < tiposServico.length) {
        const tipoServico = getRandomElement(tiposServico);
        if (!servicosSelecionados.has(tipoServico.id)) {
          servicosSelecionados.add(tipoServico.id);

          const servicoEvento: Omit<ServicoEvento, 'id'> = {
            eventoId: evento.id,
            tipoServicoId: tipoServico.id,
            tipoServico: tipoServico,
            observacoes: '',
            dataCadastro: new Date()
          };

          await servicoEventoRepo.createServicoEvento(userId, evento.id, servicoEvento);
        }
      }

      // Adicionar 3 custos se solicitado
      if (custos && tiposCusto.length > 0) {
        const custosSelecionados = new Set<string>();
        const quantidadeCustos = Math.min(3, tiposCusto.length);

        for (let j = 0; j < quantidadeCustos; j++) {
          let tipoCusto;
          let tentativas = 0;
          do {
            tipoCusto = getRandomElement(tiposCusto);
            tentativas++;
          } while (custosSelecionados.has(tipoCusto.id) && tentativas < 20);

          if (!custosSelecionados.has(tipoCusto.id)) {
            custosSelecionados.add(tipoCusto.id);

            const valorCusto = getRandomInt(100, 1000);
            const custoEvento: Omit<CustoEvento, 'id'> = {
              eventoId: evento.id,
              evento: evento,
              tipoCustoId: tipoCusto.id,
              tipoCusto: tipoCusto,
              valor: valorCusto,
              quantidade: getRandomInt(1, 5),
              observacoes: `Custo gerado automaticamente`,
              dataCadastro: new Date()
            };

            await custoEventoRepo.createCustoEvento(userId, evento.id, custoEvento);
          }
        }
      }

      // Adicionar pagamento se solicitado
      if (pagamento) {
        const valorPagamento = getRandomInt(500, Math.floor(valorTotal * 0.8));
        const dataPagamento = new Date(dataEvento.getTime() - (getRandomInt(1, 60) * 24 * 60 * 60 * 1000));

        const pagamentoData: Omit<Pagamento, 'id'> = {
          userId: userId,
          eventoId: evento.id,
          valor: valorPagamento,
          dataPagamento: dataPagamento,
          formaPagamento: getRandomElement(FORMAS_PAGAMENTO),
          status: getRandomElement(STATUS_PAGAMENTO),
          observacoes: `Pagamento gerado automaticamente`,
          dataCadastro: new Date(),
          dataAtualizacao: new Date()
        };

        await pagamentoRepo.createPagamento(userId, evento.id, pagamentoData);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${quantidadeEventos} evento(s) criado(s) com sucesso`,
      eventosCriados: eventosCriados.length,
      detalhes: {
        custosAdicionados: custos,
        pagamentosAdicionados: pagamento
      }
    });

  } catch (error: any) {
    console.error('Erro ao gerar eventos:', error);
    return NextResponse.json(
      { 
        error: 'Erro ao gerar eventos', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

