import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { AuthenticatedUser, ApiError, ApiResponse } from './types';

/**
 * Obtém o usuário autenticado da sessão
 * @throws {ApiError} Se o usuário não estiver autenticado
 */
export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new ApiError('Não autenticado', 401);
  }
  return {
    id: session.user.id,
    role: session.user.role,
    email: session.user.email,
    name: (session.user as any).name
  };
}

/**
 * Obtém o usuário autenticado, permitindo opcional
 * @returns Usuário autenticado ou null
 */
export async function getAuthenticatedUserOptional(): Promise<AuthenticatedUser | null> {
  try {
    return await getAuthenticatedUser();
  } catch {
    return null;
  }
}

/**
 * Verifica se o usuário é admin
 * @throws {ApiError} Se o usuário não for admin
 */
export async function requireAdmin(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user.role !== 'admin') {
    throw new ApiError('Acesso negado. Apenas administradores podem acessar este recurso.', 403);
  }
  return user;
}

/**
 * Trata erros de forma padronizada
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { 
        error: error.message,
        ...(error.details && { details: error.details })
      },
      { status: error.statusCode }
    );
  }

  // Log erro não tratado
  console.error('Erro não tratado na API:', error);
  
  return NextResponse.json(
    { 
      error: 'Erro interno do servidor',
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
        details: error.message,
        stack: error.stack
      })
    },
    { status: 500 }
  );
}

/**
 * Cria resposta de sucesso padronizada
 */
export function createApiResponse<T = any>(
  data: T,
  status: number = 200,
  message?: string
): NextResponse {
  const response: ApiResponse<T> = { data };
  if (message) {
    response.message = message;
  }
  return NextResponse.json(response, { status });
}

/**
 * Cria resposta de erro padronizada
 */
export function createErrorResponse(
  error: string,
  status: number = 400,
  details?: any
): NextResponse {
  return NextResponse.json(
    { error, ...(details && { details }) },
    { status }
  );
}

/**
 * Valida se o body da requisição está presente
 */
export async function getRequestBody<T = any>(request: NextRequest): Promise<T> {
  try {
    const body = await request.json();
    return body as T;
  } catch (error) {
    throw new ApiError('Body da requisição inválido ou ausente', 400);
  }
}

/**
 * Obtém parâmetros da URL de forma segura
 */
export async function getRouteParams<T = Record<string, string>>(
  params: Promise<{ [key: string]: string }>
): Promise<T> {
  try {
    return (await params) as T;
  } catch (error) {
    throw new ApiError('Parâmetros da rota inválidos', 400);
  }
}

/**
 * Obtém query parameters da URL
 */
export function getQueryParams(request: NextRequest): URLSearchParams {
  const { searchParams } = new URL(request.url);
  return searchParams;
}

/**
 * Obtém userId com suporte a autenticação via sessão, API key ou dev mode
 * Útil para rotas de migração/normalização que podem ser chamadas via API
 * @param request - Request object
 * @param body - Body já lido (opcional, para evitar leitura duplicada)
 * @returns userId ou null se não autenticado
 */
export async function getUserIdWithApiKeyOrDev(
  request: NextRequest,
  body?: any
): Promise<string | null> {
  // Tentar autenticação via sessão primeiro
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user.id;
  }

  // Verificar API key ou dev mode
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
  const isDevMode = process.env.NODE_ENV === 'development';

  // Obter userId do body (se fornecido) ou query params
  const queryParams = new URL(request.url).searchParams;
  const bodyUserId = body?.userId || queryParams.get('userId') || null;

  if (apiKey) {
    const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
    if (apiKey !== validApiKey && !apiKey.includes(validApiKey)) {
      return null; // API key inválida
    }
    return bodyUserId;
  }

  if (isDevMode) {
    return bodyUserId;
  }

  return null; // Não autenticado
}

