import type { Plano, Assinatura } from '@/types/funcionalidades';
import type { User } from '@/types';

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getAssinaturaRepository: vi.fn(),
    getPlanoRepository: vi.fn(),
    getUserRepository: vi.fn()
  }
}));

import { AssinaturaService } from './assinatura-service';

function criarPlanoBase(): Plano {
  const agora = new Date('2026-01-01T10:00:00.000Z');
  return {
    id: 'plano-1',
    nome: 'Básico',
    descricao: 'Plano básico',
    codigoHotmart: 'BASICO_MENSAL',
    funcionalidades: ['F1'],
    preco: 49.9,
    intervalo: 'mensal',
    ativo: true,
    destaque: false,
    dataCadastro: agora,
    dataAtualizacao: agora
  };
}

function criarUser(role: 'admin' | 'user'): User {
  const agora = new Date('2026-01-01T10:00:00.000Z');
  return {
    id: role === 'admin' ? 'admin-1' : 'user-1',
    email: `${role}@teste.com`,
    nome: `Usuário ${role}`,
    role,
    ativo: true,
    dataCadastro: agora,
    dataAtualizacao: agora
  };
}

function criarAssinaturaAtiva(userId: string, planoId: string): Assinatura {
  const agora = new Date('2026-01-01T10:00:00.000Z');
  return {
    id: 'ass-1',
    userId,
    planoId,
    hotmartSubscriptionId: 'SUB-1',
    status: 'active',
    dataInicio: agora,
    funcionalidadesHabilitadas: ['F1'],
    historico: [],
    dataCadastro: agora,
    dataAtualizacao: agora
  };
}

describe('AssinaturaService', () => {
  it('retorna acesso total para admin em obterStatusPlanoUsuario', async () => {
    const plano = criarPlanoBase();
    const userRepo = {
      findById: vi.fn().mockResolvedValue(criarUser('admin')),
      update: vi.fn()
    };
    const planoRepo = {
      findAtivos: vi.fn().mockResolvedValue([plano]),
      findById: vi.fn(),
      findByCodigoHotmart: vi.fn()
    };
    const assinaturaRepo = {
      findByUserId: vi.fn(),
      findById: vi.fn(),
      findAllByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      addHistorico: vi.fn(),
      atualizarStatus: vi.fn()
    };

    const service = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const status = await service.obterStatusPlanoUsuario('admin-1');

    expect(status.ativo).toBe(true);
    expect(status.pagamentoEmDia).toBe(true);
    expect(status.status).toBe('active');
    expect(status.mensagem).toContain('Admin');
    expect(status.plano?.id).toBe('plano-1');
  });

  it('retorna sem_assinatura quando usuário comum não possui assinatura', async () => {
    const userRepo = {
      findById: vi.fn().mockResolvedValue(criarUser('user')),
      update: vi.fn()
    };
    const planoRepo = {
      findAtivos: vi.fn(),
      findById: vi.fn(),
      findByCodigoHotmart: vi.fn()
    };
    const assinaturaRepo = {
      findByUserId: vi.fn().mockResolvedValue(null),
      findById: vi.fn(),
      findAllByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      addHistorico: vi.fn(),
      atualizarStatus: vi.fn()
    };

    const service = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const status = await service.obterStatusPlanoUsuario('user-1');

    expect(status.status).toBe('sem_assinatura');
    expect(status.ativo).toBe(false);
    expect(status.pagamentoEmDia).toBe(false);
    expect(status.assinatura).toBeNull();
  });

  it('retorna status active para usuário comum com assinatura ativa', async () => {
    const plano = criarPlanoBase();
    const assinatura = criarAssinaturaAtiva('user-1', plano.id);
    const userRepo = {
      findById: vi.fn().mockResolvedValue(criarUser('user')),
      update: vi.fn()
    };
    const planoRepo = {
      findAtivos: vi.fn(),
      findById: vi.fn().mockResolvedValue(plano),
      findByCodigoHotmart: vi.fn()
    };
    const assinaturaRepo = {
      findByUserId: vi.fn().mockResolvedValue(assinatura),
      findById: vi.fn(),
      findAllByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      addHistorico: vi.fn(),
      atualizarStatus: vi.fn()
    };

    const service = new AssinaturaService(assinaturaRepo, planoRepo, userRepo);
    const status = await service.obterStatusPlanoUsuario('user-1');

    expect(status.status).toBe('active');
    expect(status.ativo).toBe(true);
    expect(status.pagamentoEmDia).toBe(true);
    expect(status.plano?.id).toBe(plano.id);
  });
});

