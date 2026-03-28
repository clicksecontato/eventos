import { describe, expect, it } from 'vitest';
import type { Contrato, ContratoSignatarioListagem } from '@/types';
import {
  contratoPassaFiltroStatusLista,
  obterExibicaoStatusContratoNaLista,
} from './contrato-listagem-assinaturas';

function contratoBase(partial: Partial<Contrato> & { signatariosListagem?: ContratoSignatarioListagem[] }): Contrato & {
  signatariosListagem?: ContratoSignatarioListagem[];
} {
  return {
    id: 'c1',
    userId: 'u1',
    modeloContratoId: 'm1',
    dadosPreenchidos: {},
    status: 'gerado',
    dataGeracao: new Date(),
    dataCadastro: new Date(),
    dataAtualizacao: new Date(),
    criadoPor: 'u1',
    ...partial,
  };
}

describe('obterExibicaoStatusContratoNaLista', () => {
  it('assinado sem signatários: simples Assinado', () => {
    const ex = obterExibicaoStatusContratoNaLista(contratoBase({ status: 'assinado' }));
    expect(ex.tipo).toBe('simples');
    if (ex.tipo === 'simples') expect(ex.rotulo).toBe('Assinado');
  });

  it('assinado com 2 de 3: colhendo', () => {
    const ex = obterExibicaoStatusContratoNaLista(
      contratoBase({
        status: 'assinado',
        signatariosListagem: [
          { id: '1', nome: 'A', email: 'a@x.com', status: 'assinado', papelParte: 'cliente' },
          { id: '2', nome: 'B', email: 'b@x.com', status: 'assinado', papelParte: 'contratante' },
          { id: '3', nome: 'C', email: 'c@x.com', status: 'pendente', papelParte: 'contratada' },
        ],
      })
    );
    expect(ex.tipo).toBe('colhendo');
    if (ex.tipo === 'colhendo') {
      expect(ex.assinados).toBe(2);
      expect(ex.total).toBe(3);
    }
  });

  it('assinado com todos signatários: assinado_todos', () => {
    const ex = obterExibicaoStatusContratoNaLista(
      contratoBase({
        status: 'assinado',
        signatariosListagem: [
          { id: '1', nome: 'A', email: 'a@x.com', status: 'assinado', papelParte: 'cliente' },
        ],
      })
    );
    expect(ex.tipo).toBe('assinado_todos_signatarios');
  });
});

describe('contratoPassaFiltroStatusLista', () => {
  const parcial = contratoBase({
    status: 'assinado',
    signatariosListagem: [
      { id: '1', nome: 'A', email: 'a@x.com', status: 'assinado', papelParte: 'cliente' },
      { id: '2', nome: 'B', email: 'b@x.com', status: 'pendente', papelParte: 'contratante' },
    ],
  });

  it('filtro colhendo_assinaturas inclui parcial', () => {
    expect(contratoPassaFiltroStatusLista(parcial, 'colhendo_assinaturas')).toBe(true);
  });

  it('filtro assinado exclui parcial', () => {
    expect(contratoPassaFiltroStatusLista(parcial, 'assinado')).toBe(false);
  });
});
