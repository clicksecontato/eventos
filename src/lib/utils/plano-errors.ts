/**
 * Helper para tratar erros de plano e mostrar toast informativo
 * com opção de redirecionar para página de planos
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
      mensagem = 'Você ainda não possui um plano ativo. Contrate um plano para começar a usar todas as funcionalidades!';
    } else if (errorMessage.includes('limite') || errorMessage.includes('atingido')) {
      mensagem = 'Você atingiu o limite do seu plano. Faça upgrade para continuar criando!';
    } else {
      // Mensagem genérica apenas se não houver mensagem original clara
      mensagem = originalMessage || 'Esta funcionalidade não está disponível no seu plano atual. Faça upgrade para acessar!';
    }

    // Mostrar toast com ação para contratar planos
    showToast(
      mensagem,
      'warning',
      10000, // 10 segundos para dar tempo de ler e clicar
      {
        label: 'Ver Planos Disponíveis',
        onClick: navigateToPlanos
      }
    );
    
    return true; // Indica que o erro foi tratado
  }

  return false; // Erro não é de plano
}

