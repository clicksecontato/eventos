import { POST } from './route';
import { authService } from '@/lib/auth-service';
import { createErrorResponse } from '@/lib/api/route-helpers';

vi.mock('@/lib/auth-service', () => ({
  authService: {
    confirmPasswordReset: vi.fn()
  }
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getRequestBody: vi.fn(async (request: Request) => request.json()),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, status, error })),
  handleApiError: vi.fn((error: unknown) => ({ ok: false, error }))
}));

describe('API /api/auth/confirm-reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando senha é fraca', async () => {
    const request = new Request('http://localhost/api/auth/confirm-reset-password', {
      method: 'POST',
      body: JSON.stringify({ code: 'ABC123', newPassword: 'abc123' })
    });

    const response = await POST(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith(
      'A senha deve atender aos critérios mínimos de segurança (mínimo 3 de 4: maiúscula, minúscula, número, caractere especial)',
      400
    );
    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        status: 400
      })
    );
  });

  it('redefine senha quando payload é válido', async () => {
    vi.mocked(authService.confirmPasswordReset).mockResolvedValue({
      success: true
    } as never);

    const request = new Request('http://localhost/api/auth/confirm-reset-password', {
      method: 'POST',
      body: JSON.stringify({ code: 'ABC123', newPassword: 'Senha@123' })
    });

    const response = await POST(request as never);

    expect(authService.confirmPasswordReset).toHaveBeenCalledWith('ABC123', 'Senha@123');
    expect(response).toEqual({
      ok: true,
      status: 200,
      data: { success: true, message: 'Senha redefinida com sucesso' }
    });
  });
});
