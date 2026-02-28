/**
 * Helper para tratar erros de plano e mostrar toast informativo
 * com opção de abrir página de status da assinatura
 */
export function handlePlanoError(
  error: any,
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning', duration?: number, action?: { label: string; onClick: () => void }) => void,
  navigateToPlanos: () => void
): boolean {
  // Verificar se é erro de plano/limite
  const errorMessage = error.message?.toLowerCase() || '';
  const originalMessage = error.message || '';
  
  const isPlanoError = 
    error.status === 403 || 
    errorMessage.includes('plano') || 
    errorMessage.includes('limite') ||
    errorMessage.includes('permissão') ||
    errorMessage.includes('permissao') ||
    errorMessage.includes('não permite') ||
    errorMessage.includes('nao permite') ||
    errorMessage.includes('não tem plano') ||
    errorMessage.includes('sem plano') ||
    errorMessage.includes('sem assinatura');

  if (isPlanoError) {
    // Se a mensagem original já for clara e explicativa sobre o plano, usar ela
    // Caso contrário, criar uma mensagem amigável baseada no tipo de erro
    let mensagem = '';
    
    // Verificar se a mensagem original já é clara sobre limitação de plano
    const mensagemOriginalClara = 
      originalMessage.includes('plano não permite') ||
      originalMessage.includes('plano atual') ||
      originalMessage.includes('limite') ||
      originalMessage.includes('não permite');
    
    if (mensagemOriginalClara && originalMessage.length > 0) {
      // Usar a mensagem original que já é clara
      mensagem = originalMessage;
    } else if (errorMessage.includes('não tem plano') || errorMessage.includes('sem plano') || errorMessage.includes('sem assinatura')) {
      mensagem = 'Sua conta está sem assinatura ativa. Entre em contato com o administrador para liberação.';
    } else if (errorMessage.includes('limite') || errorMessage.includes('atingido')) {
      mensagem = 'Você atingiu o limite disponível para seu perfil. Solicite ajuste ao administrador.';
    } else {
      // Mensagem genérica apenas se não houver mensagem original clara
      mensagem = originalMessage || 'Esta funcionalidade não está disponível para seu perfil atual. Solicite ajuste ao administrador.';
    }

    // Mostrar toast com ação para ver detalhes da assinatura/status
    showToast(
      mensagem,
      'warning',
      10000, // 10 segundos para dar tempo de ler e clicar
      {
        label: 'Ver status da assinatura',
        onClick: () => {
          if (typeof window !== 'undefined') {
            window.location.href = '/assinatura';
          } else {
            navigateToPlanos();
          }
        }
      }
    );
    
    return true; // Indica que o erro foi tratado
  }

  return false; // Erro não é de plano
}

