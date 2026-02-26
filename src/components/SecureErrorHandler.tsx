'use client';

import { useEffect } from 'react';

export function SecureErrorHandler() {
  useEffect(() => {
    // Suprimir logs que expõem informações sensíveis sobre o banco de dados
    if (typeof window === 'undefined') return;
    
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const originalConsoleLog = console.log;
    
    // Filtrar mensagens que expõem informações sensíveis
    const shouldSuppress = (message: string): boolean => {
      const lowerMessage = message.toLowerCase();
      
      return (
        lowerMessage.includes('firestore.googleapis.com') ||
        lowerMessage.includes('rid=') ||
        lowerMessage.includes('aid=') ||
        lowerMessage.includes('sid=') ||
        lowerMessage.includes('gsessionid') ||
        lowerMessage.includes('collection') ||
        lowerMessage.includes('subcollection') ||
        lowerMessage.includes('firestore') ||
        lowerMessage.includes('repository') ||
        lowerMessage.includes('fetch finished loading') ||
        lowerMessage.includes('fetch failed loading') ||
        lowerMessage.includes('webchannel') ||
        lowerMessage.includes('_utils.js') ||
        lowerMessage.includes('/api/auth/session') ||
        lowerMessage.includes('stack trace') ||
        (lowerMessage.includes('at ') && lowerMessage.includes('.ts:')) ||
        (lowerMessage.includes('at ') && lowerMessage.includes('.tsx:')) ||
        (lowerMessage.includes('at ') && lowerMessage.includes('_utils.js'))
      );
    };
    
    // Substituir console.error
    console.error = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      if (shouldSuppress(message)) {
        return; // Suprimir o log
      }
      
      originalConsoleError.apply(console, args);
    };
    
    // Substituir console.warn
    console.warn = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      if (shouldSuppress(message)) {
        return; // Suprimir o log
      }
      
      originalConsoleWarn.apply(console, args);
    };
    
    // Substituir console.log
    console.log = (...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'string' ? arg : JSON.stringify(arg)
      ).join(' ');
      
      if (shouldSuppress(message)) {
        return; // Suprimir o log
      }
      
      originalConsoleLog.apply(console, args);
    };
    
    // Limpar ao desmontar
    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      console.log = originalConsoleLog;
    };
  }, []);
  
  return null;
}

