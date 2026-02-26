/**
 * Utilitário para tratamento seguro de erros
 * Não expõe informações sensíveis ou stack traces no console do navegador
 */

export class SecureError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'SecureError';
    // Não incluir stack trace para não expor estrutura do código
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SecureError);
    }
  }
}

/**
 * Wrapper para tratar erros sem expor informações sensíveis
 */
export function handleError(error: unknown, context?: string): never {
  // Em produção, não expor detalhes do erro
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Em produção, lançar erro genérico sem detalhes
    throw new SecureError('Ocorreu um erro. Por favor, tente novamente.');
  }
  
  // Em desenvolvimento, pode mostrar erro detalhado apenas no servidor
  if (error instanceof Error) {
    throw new SecureError(
      context ? `${context}: ${error.message}` : error.message,
      error
    );
  }
  
  throw new SecureError('Ocorreu um erro desconhecido.');
}

/**
 * Função para capturar e suprimir logs de erro sensíveis no cliente
 */
export function suppressErrorLogs() {
  if (typeof window === 'undefined') return;
  
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  
  // Substituir console.error para filtrar informações sensíveis
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Não logar URLs do Firestore ou informações de conexão
    if (
      message.includes('firestore.googleapis.com') ||
      message.includes('RID=') ||
      message.includes('AID=') ||
      message.includes('SID=') ||
      message.includes('gsessionid') ||
      message.includes('collection') ||
      message.includes('subcollection') ||
      message.includes('Firestore') ||
      message.includes('stack trace') ||
      message.includes('Stack trace')
    ) {
      return; // Suprimir o log
    }
    
    // Em produção, não mostrar detalhes
    if (process.env.NODE_ENV === 'production') {
      return; // Suprimir todos os logs em produção
    }
    
    originalConsoleError.apply(console, args);
  };
  
  // Substituir console.warn para filtrar informações sensíveis
  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    
    // Não logar informações sobre estrutura do banco
    if (
      message.includes('firestore.googleapis.com') ||
      message.includes('collection') ||
      message.includes('subcollection') ||
      message.includes('Firestore')
    ) {
      return; // Suprimir o log
    }
    
    originalConsoleWarn.apply(console, args);
  };
}

