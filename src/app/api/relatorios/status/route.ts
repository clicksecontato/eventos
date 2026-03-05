import { format } from 'date-fns';
import { getAuthenticatedUser, createApiResponse, handleApiError } from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

interface StatusRelatoriosData {
  dateKey: string;
  ultimaAtualizacao: string | null;
}

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    const hoje = new Date();
    const dateKey = format(hoje, 'yyyyMMdd');

    const relatoriosRepo = repositoryFactory.getRelatoriosDiariosRepository();
    const cached = await relatoriosRepo.getRelatorioDiario(user.id, dateKey);

    const payload: StatusRelatoriosData = {
      dateKey,
      ultimaAtualizacao: cached?.dataGeracao
        ? new Date(cached.dataGeracao).toISOString()
        : null
    };

    return createApiResponse(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

