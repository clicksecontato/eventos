import { POST } from './route';
import { createErrorResponse } from '@/lib/api/route-helpers';
import { isFirebaseAdminInitialized } from '@/lib/firebase-admin';

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: { getUserByEmail: vi.fn() },
  isFirebaseAdminInitialized: vi.fn(),
  getFirebaseAdminInitializationError: vi.fn(() => new Error('init fail'))
}));

vi.mock('@/lib/services/email-service', () => ({
  generatePasswordResetEmailTemplate: vi.fn(() => '<html>ok</html>')
}));

vi.mock('@/lib/services/password-link-service', () => ({
  createPasswordResetLink: vi.fn(async () => ({ resetUrl: 'https://example.com/reset' }))
}));

vi.mock('@/lib/services/resend-email-service', () => ({
  sendEmail: vi.fn(async () => ({ success: true })),
  isEmailServiceConfigured: vi.fn(() => true)
}));

vi.mock('@/lib/composition/server-assinatura-context', () => ({
  createRepositoriosAdminBasicos: vi.fn(async () => ({
    userRepo: { findById: vi.fn(async () => ({ nome: 'User Teste' })) }
  }))
}));

vi.mock('@/lib/api/route-helpers', () => ({
  getRequestBody: vi.fn(async (request: Request) => request.json()),
  createApiResponse: vi.fn((data: unknown, status = 200) => ({ ok: true, status, data })),
  createErrorResponse: vi.fn((error: string, status = 400) => ({ ok: false, status, error }))
}));

describe('API /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna 400 quando email não é informado', async () => {
    const request = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({})
    });

    const response = await POST(request as never);

    expect(createErrorResponse).toHaveBeenCalledWith('Email é obrigatório', 400);
    expect(response).toEqual({ ok: false, status: 400, error: 'Email é obrigatório' });
  });

  it('retorna 500 quando Firebase Admin não está inicializado', async () => {
    vi.mocked(isFirebaseAdminInitialized).mockReturnValue(false);

    const request = new Request('http://localhost/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@teste.com' })
    });

    const response = await POST(request as never);

    expect(response).toEqual(
      expect.objectContaining({
        ok: false,
        status: 500
      })
    );
  });
});
