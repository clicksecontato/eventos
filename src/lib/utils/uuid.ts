/**
 * Helper para gerar UUID que funciona tanto no cliente quanto no servidor
 * No Next.js, crypto.randomUUID() funciona tanto no cliente quanto no servidor
 */
export function generateUUID(): string {
  // No Next.js, crypto.randomUUID() funciona tanto no cliente quanto no servidor
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback: gerar UUID v4 manualmente
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}













