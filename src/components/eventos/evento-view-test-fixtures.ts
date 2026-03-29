import type { AgendamentoAlocacao, Cliente, Evento, ServicoEvento, TipoServico } from '@/types';

const dataRef = new Date('2026-06-15T12:00:00.000Z');

export function clienteEventoViewMinimo(over?: Partial<Cliente>): Cliente {
  return {
    id: 'c-fix',
    nome: 'Cliente Fixture',
    cpf: '00000000000',
    email: 'cliente@fixture.test',
    telefone: '(11) 98888-7777',
    endereco: 'Rua Fixture, 1',
    cep: '01310-100',
    dataCadastro: dataRef,
    ...over,
  };
}

/** Evento mínimo válido para testes de UI do detalhe (abas básico / cópia). */
export function eventoEventoViewMinimo(over?: Partial<Evento>): Evento {
  return {
    id: 'ev-fix',
    clienteId: 'c-fix',
    cliente: clienteEventoViewMinimo(),
    nomeEvento: 'Evento Fixture',
    dataEvento: new Date('2026-07-20T15:00:00.000Z'),
    diaSemana: 'domingo',
    tipoEvento: 'Casamento',
    horarioInicio: '18:00',
    horarioFim: '23:00',
    status: 'Agendado',
    valorTotal: 10_000,
    diaFinalPagamento: dataRef,
    dataCadastro: dataRef,
    dataAtualizacao: dataRef,
    ...over,
  };
}

export function tipoServicoMinimo(over?: Partial<TipoServico>): TipoServico {
  return {
    id: 'ts-fix',
    nome: 'Pacote Foto',
    descricao: 'Teste',
    valorPadrao: 500,
    ativo: true,
    dataCadastro: dataRef,
    ...over,
  };
}

export function servicoEventoMinimo(over?: Partial<ServicoEvento>): ServicoEvento {
  return {
    id: 'se-fix',
    eventoId: 'ev-fix',
    servicoId: 'ts-fix',
    tipoServico: tipoServicoMinimo(),
    dataCadastro: dataRef,
    ...over,
  };
}

export function alocacaoMinima(over?: Partial<AgendamentoAlocacao>): AgendamentoAlocacao {
  return {
    id: 'al-fix',
    userId: 'u1',
    empresaId: 'emp1',
    eventoId: 'ev-fix',
    profissionalId: 'prof-fix',
    inicioTs: new Date('2026-07-20T14:00:00.000Z'),
    fimTs: new Date('2026-07-20T22:00:00.000Z'),
    status: 'agendado',
    dataCadastro: dataRef,
    dataAtualizacao: dataRef,
    ...over,
  };
}
