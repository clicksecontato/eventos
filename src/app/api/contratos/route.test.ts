import { GET, POST } from './route';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { s3Service } from '@/lib/s3-service';
import { getAuthenticatedUser } from '@/lib/api/route-helpers';

const findAllMock = vi.fn();
const findByEventoIdMock = vi.fn();
const modeloFindByIdMock = vi.fn();
const eventoFindByIdMock = vi.fn();
const createMock = vi.fn();

vi.mock('@/lib/s3-service', () => ({
  s3Service: {
    getSignedUrl: vi.fn()
  }
}));

vi.mock('@/lib/repositories/repository-factory', () => ({
  repositoryFactory: {
    getContratoRepository: vi.fn(),
    getModeloContratoRepository: vi.fn(),
    getEventoRepository: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getAuthenticatedUser: vi.fn(),
  getQueryParams: vi.fn((request: Request) => new URL(request.url).searchParams),
  getRequestBody: vi.fn(async (request: Request) => request.json()),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400, details?: unknown) => ({ ok: false, status, error, details })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

vi.mock('@/lib/services/contrato-service', () => ({
  ContratoService: {
    validarDadosPreenchidos: vi.fn(() => ({ valido: true, erros: [] })),
    gerarNumeroContrato: vi.fn(async () => 'CTR-2026-0001')
  }
}));

describe('API /api/contratos', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      id: 'user-1',
      role: 'user',
      email: 'user@teste.com'
    } as never);
    vi.mocked(repositoryFactory.getContratoRepository).mockReturnValue({
      findAll: findAllMock,
      findByEventoId: findByEventoIdMock,
      create: createMock
    } as never);
    vi.mocked(repositoryFactory.getModeloContratoRepository).mockReturnValue({
      findById: modeloFindByIdMock
    } as never);
    vi.mocked(repositoryFactory.getEventoRepository).mockReturnValue({
      findById: eventoFindByIdMock
    } as never);
    vi.mocked(s3Service.getSignedUrl).mockResolvedValue('https://signed-url');
  });

  it('GET retorna contratos com modelo e evento populados', async () => {
    findAllMock.mockResolvedValue([
      {
        id: 'c1',
        status: 'gerado',
        modeloContratoId: 'm1',
        eventoId: 'e1',
        pdfPath: 'pdfs/c1.pdf'
      }
    ]);
    modeloFindByIdMock.mockResolvedValue({ id: 'm1', nome: 'Modelo 1' });
    eventoFindByIdMock.mockResolvedValue({ id: 'e1', nomeEvento: 'Evento 1' });

    const response = await GET(new Request('http://localhost/api/contratos') as never);

    expect(findAllMock).toHaveBeenCalledWith('user-1');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: [
        expect.objectContaining({
          id: 'c1',
          modeloContrato: { id: 'm1', nome: 'Modelo 1' },
          evento: { id: 'e1', nomeEvento: 'Evento 1' },
          pdfUrl: 'https://signed-url'
        })
      ]
    });
  });

  it('POST valida campos obrigatórios', async () => {
    const request = new Request('http://localhost/api/contratos', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request as never);

    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        status: 400,
        error: 'modeloContratoId e dadosPreenchidos são obrigatórios'
      })
    );
  });
});
