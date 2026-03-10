import { GET } from './route';
import { dataService } from '@/lib/data-service';
import { createApiResponse, createErrorResponse, getAuthenticatedUser } from '@/lib/api/route-helpers';

vi.mock('@/lib/data-service', () => ({
  dataService: {
    getEventos: vi.fn(),
    getAllEventos: vi.fn(),
    getEventosArquivados: vi.fn(),
    getEventoById: vi.fn(),
    getAllClientes: vi.fn(),
    getServicosPorEventos: vi.fn(),
    getCanaisEntradaAtivos: vi.fn(),
    getAllServicosCatalogo: vi.fn(),
    getAllPagamentos: vi.fn(),
    getAllCustos: vi.fn(),
    getAllServicos: vi.fn(),
    getDashboardData: vi.fn(),
    getAgendamentoAlocacoesPorEventos: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  createApiResponse: vi.fn((data: unknown) => ({ ok: true, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, error, status })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      email: 'admin@teste.com'
    });
  });

  it('retorna clientes-all via dataService', async () => {
    vi.mocked(dataService.getAllClientes).mockResolvedValue([{ id: 'c1', nome: 'Cliente 1' }] as never);
    const request = { url: 'http://localhost/api/data?recurso=clientes-all' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllClientes).toHaveBeenCalledWith('user-1');
    expect(createApiResponse).toHaveBeenCalled();
    expect(response).toEqual({ ok: true, data: [{ id: 'c1', nome: 'Cliente 1' }] });
  });

  it('retorna eventos para recurso eventos', async () => {
    vi.mocked(dataService.getEventos).mockResolvedValue([{ id: 'ev-1', nomeEvento: 'Evento 1' }] as never);
    const request = { url: 'http://localhost/api/data?recurso=eventos' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getEventos).toHaveBeenCalledWith('user-1', undefined, undefined, undefined);
    expect(response).toEqual({ ok: true, data: [{ id: 'ev-1', nomeEvento: 'Evento 1' }] });
  });

  it('retorna eventos-all para recurso eventos-all', async () => {
    vi.mocked(dataService.getAllEventos).mockResolvedValue([{ id: 'ev-2' }] as never);
    const request = { url: 'http://localhost/api/data?recurso=eventos-all' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllEventos).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({ ok: true, data: [{ id: 'ev-2' }] });
  });

  it('retorna eventos arquivados para recurso eventos-arquivados', async () => {
    vi.mocked(dataService.getEventosArquivados).mockResolvedValue([{ id: 'ev-arch-1' }] as never);
    const request = { url: 'http://localhost/api/data?recurso=eventos-arquivados' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getEventosArquivados).toHaveBeenCalledWith('user-1', undefined, undefined, undefined);
    expect(response).toEqual({ ok: true, data: [{ id: 'ev-arch-1' }] });
  });

  it('repasse profissionalId no recurso eventos', async () => {
    vi.mocked(dataService.getEventos).mockResolvedValue([{ id: 'ev-1' }] as never);
    const request = {
      url: 'http://localhost/api/data?recurso=eventos&profissionalId=prof-1'
    } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getEventos).toHaveBeenCalledWith('user-1', 'prof-1', undefined, undefined);
    expect(response).toEqual({ ok: true, data: [{ id: 'ev-1' }] });
  });

  it('repasse limit e offset no recurso eventos', async () => {
    vi.mocked(dataService.getEventos).mockResolvedValue([{ id: 'ev-1' }] as never);
    const request = {
      url: 'http://localhost/api/data?recurso=eventos&limit=10&offset=20'
    } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getEventos).toHaveBeenCalledWith('user-1', undefined, 10, 20);
    expect(response).toEqual({ ok: true, data: [{ id: 'ev-1' }] });
  });

  it('retorna evento por id para recurso evento', async () => {
    vi.mocked(dataService.getEventoById).mockResolvedValue({ id: 'ev-99' } as never);
    const request = { url: 'http://localhost/api/data?recurso=evento&id=ev-99' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getEventoById).toHaveBeenCalledWith('ev-99', 'user-1');
    expect(response).toEqual({ ok: true, data: { id: 'ev-99' } });
  });

  it('retorna erro quando evento não recebe id', async () => {
    const request = { url: 'http://localhost/api/data?recurso=evento' } as unknown as Request;

    const response = await GET(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Parâmetro "id" é obrigatório', 400);
    expect(response).toEqual({ ok: false, error: 'Parâmetro "id" é obrigatório', status: 400 });
  });

  it('serializa map de servicos-eventos para objeto', async () => {
    const map = new Map<string, Array<{ id: string }>>([
      ['ev-1', [{ id: 's1' }]],
      ['ev-2', [{ id: 's2' }]]
    ]);
    vi.mocked(dataService.getServicosPorEventos).mockResolvedValue(map as never);
    const request = {
      url: 'http://localhost/api/data?recurso=servicos-eventos&eventoIds=ev-1,ev-2'
    } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getServicosPorEventos).toHaveBeenCalledWith('user-1', ['ev-1', 'ev-2']);
    expect(response).toEqual({
      ok: true,
      data: {
        'ev-1': [{ id: 's1' }],
        'ev-2': [{ id: 's2' }]
      }
    });
  });

  it('retorna erro quando recurso é inválido', async () => {
    const request = { url: 'http://localhost/api/data?recurso=nao-existe' } as unknown as Request;

    const response = await GET(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Parâmetro "recurso" inválido', 400);
    expect(response).toEqual({ ok: false, error: 'Parâmetro "recurso" inválido', status: 400 });
  });

  it('retorna canais de entrada para recurso canais-entrada', async () => {
    vi.mocked(dataService.getCanaisEntradaAtivos).mockResolvedValue([
      { id: 'canal-1', nome: 'Instagram' }
    ] as never);
    const request = { url: 'http://localhost/api/data?recurso=canais-entrada' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getCanaisEntradaAtivos).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({ ok: true, data: [{ id: 'canal-1', nome: 'Instagram' }] });
  });

  it('retorna serviços de catálogo para recurso tipos-servico', async () => {
    vi.mocked(dataService.getAllServicosCatalogo).mockResolvedValue([
      { id: 'srv-1', nome: 'Totem' }
    ] as never);
    const request = { url: 'http://localhost/api/data?recurso=tipos-servico' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllServicosCatalogo).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({ ok: true, data: [{ id: 'srv-1', nome: 'Totem' }] });
  });

  it('retorna pagamentos agregados para recurso pagamentos-all', async () => {
    vi.mocked(dataService.getAllPagamentos).mockResolvedValue([
      { id: 'pag-1', valor: 1000 }
    ] as never);
    const request = { url: 'http://localhost/api/data?recurso=pagamentos-all' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllPagamentos).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({ ok: true, data: [{ id: 'pag-1', valor: 1000 }] });
  });

  it('retorna custos agregados para recurso custos-all', async () => {
    vi.mocked(dataService.getAllCustos).mockResolvedValue([
      { id: 'custo-1', valor: 250 }
    ] as never);
    const request = { url: 'http://localhost/api/data?recurso=custos-all' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllCustos).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({ ok: true, data: [{ id: 'custo-1', valor: 250 }] });
  });

  it('retorna serviços agregados para recurso servicos-all', async () => {
    vi.mocked(dataService.getAllServicos).mockResolvedValue([
      { id: 'se-1', nome: 'Serviço X' }
    ] as never);
    const request = { url: 'http://localhost/api/data?recurso=servicos-all' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAllServicos).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({ ok: true, data: [{ id: 'se-1', nome: 'Serviço X' }] });
  });

  it('retorna erro quando pagamentos-evento não recebe eventoId', async () => {
    const request = { url: 'http://localhost/api/data?recurso=pagamentos-evento' } as unknown as Request;

    const response = await GET(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Parâmetro "eventoId" é obrigatório', 400);
    expect(response).toEqual({ ok: false, error: 'Parâmetro "eventoId" é obrigatório', status: 400 });
  });

  it('repasse forceRefresh no recurso dashboard', async () => {
    vi.mocked(dataService.getDashboardData).mockResolvedValue({
      eventosHoje: 2
    } as never);
    const request = { url: 'http://localhost/api/data?recurso=dashboard&forceRefresh=true' } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getDashboardData).toHaveBeenCalledWith('user-1', { forceRefresh: true });
    expect(response).toEqual({ ok: true, data: { eventosHoje: 2 } });
  });

  it('repasse profissionalId no recurso agendamento-alocacoes-eventos', async () => {
    const map = new Map<string, Array<{ id: string }>>([
      ['ev-1', [{ id: 'aloc-1' }]]
    ]);
    vi.mocked(dataService.getAgendamentoAlocacoesPorEventos).mockResolvedValue(map as never);
    const request = {
      url: 'http://localhost/api/data?recurso=agendamento-alocacoes-eventos&eventoIds=ev-1&profissionalId=prof-1'
    } as unknown as Request;

    const response = await GET(request as never);

    expect(dataService.getAgendamentoAlocacoesPorEventos).toHaveBeenCalledWith('user-1', ['ev-1'], 'prof-1');
    expect(response).toEqual({
      ok: true,
      data: {
        'ev-1': [{ id: 'aloc-1' }]
      }
    });
  });
});

