import { POST } from './route';
import { authService } from '@/lib/auth-service';
import { createErrorResponse } from '@/lib/api/route-helpers';

vi.mock('@/lib/auth-service', () => ({
  authService: {
    verifyResetCode: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getRequestBody: vi.fn(async (request: Request) => request.json()),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, status, error })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/auth/verify-reset-code', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando code não é enviado', async () => {
    const request = new Request('http://localhost/api/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Código de redefinição é obrigatório', 400);
    expect(response).toEqual({ ok: false, status: 400, error: 'Código de redefinição é obrigatório' });
  });

  it('retorna email quando código é válido', async () => {
    vi.mocked(authService.verifyResetCode).mockResolvedValue({
      success: true,
      email: 'user@teste.com'
    } as never);

    const request = new Request('http://localhost/api/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ code: 'ABC123' })
    });

    const response = await POST(request as never);

    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { success: true, email: 'user@teste.com' }
    });
  });
});
