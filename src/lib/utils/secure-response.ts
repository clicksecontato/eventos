import { NextResponse } from 'next/server';

/**
 * Utilitário para criar respostas seguras que minimizam exposição de informações
 */
export function createSecureResponse(data: any, status: number = 200): NextResponse {
  const response = NextResponse.json(data, { status });
  
  // Adicionar headers de segurança para minimizar exposição de informações
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Header para indicar que informações sensíveis não devem ser logadas
  response.headers.set('X-Sensitive-Data', 'true');
  
  return response;
}

/**
 * Remove informações sensíveis de objetos antes de enviar como resposta
 */
export function sanitizeResponse(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item));
  }
  
  const sanitized: any = {};
  const sensitiveFields = [
    'password',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'authorization',
    'stack',
    'stackTrace',
    'errorDetails',
    'internalError'
  ];
  
  for (const [key, value] of Object.entries(data)) {
    // Não incluir campos sensíveis
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      continue;
    }
    
    // Sanitizar objetos aninhados
    if (value && typeof value === 'object') {
      sanitized[key] = sanitizeResponse(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Cria uma resposta de erro genérica que não expõe detalhes internos
 */
export function createSecureErrorResponse(
  message: string = 'Ocorreu um erro. Por favor, tente novamente.',
  status: number = 500
): NextResponse {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Em produção, sempre retornar mensagem genérica
  const errorResponse = {
    error: isProduction ? message : message,
    ...(isProduction ? {} : { timestamp: new Date().toISOString() })
  };
  
  return createSecureResponse(errorResponse, status);
}

