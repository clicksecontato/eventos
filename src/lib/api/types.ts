/**
 * Tipos para rotas API padronizadas
 */

export interface AuthenticatedUser {
  id: string;
  role?: string;
  email?: string;
  name?: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
  [key: string]: any;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

