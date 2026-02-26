/**
 * Utilitário para verificar acesso ao Google Calendar baseado no plano do usuário
 * 
 * Esta função é segura e não quebra o sistema se o Google Calendar não estiver configurado.
 */

import { repositoryFactory } from '../repositories/repository-factory';

/**
 * Verifica se o usuário tem plano permitido para usar Google Calendar
 * Apenas PROFISSIONAL_MENSAL e PREMIUM_MENSAL têm acesso
 * 
 * @param userId - ID do usuário
 * @returns Promise<boolean> - true se o usuário tem acesso, false caso contrário
 */
export async function verificarAcessoGoogleCalendar(userId: string): Promise<boolean> {
  try {
    const userRepo = repositoryFactory.getUserRepository();
    const user = await userRepo.findById(userId);
    
    // Admin sempre tem acesso
    if (user?.role === 'admin') {
      return true;
    }
    
    if (!user?.assinatura?.planoCodigoHotmart) {
      return false;
    }
    
    // Planos permitidos
    const planosPermitidos = ['PROFISSIONAL_MENSAL', 'PREMIUM_MENSAL'];
    return planosPermitidos.includes(user.assinatura.planoCodigoHotmart);
  } catch (error) {
    console.error('Erro ao verificar acesso Google Calendar:', error);
    // Em caso de erro, retornar false para ser seguro
    return false;
  }
}

