import { format } from 'date-fns';
import { getAuthenticatedUser, createApiResponse, handleApiError } from '@/lib/api/route-helpers';
import { dataService } from '@/lib/data-service';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

interface AtualizacaoRelatoriosData {
  atualizadoEm: string;
}

export async function POST() {
  try {
    const user = await getAuthenticatedUser();

    await dataService.gerarTodosRelatorios(user.id);

    const hoje = new Date();
    const dateKey = format(hoje, 'yyyyMMdd');
    const relatoriosRepo = repositoryFactory.getRelatoriosDiariosRepository();
    const cached = await relatoriosRepo.getRelatorioDiario(user.id, dateKey);

    const payload: AtualizacaoRelatoriosData = {
      atualizadoEm: cached?.dataGeracao
        ? new Date(cached.dataGeracao).toISOString()
        : new Date().toISOString()
    };

    return createApiResponse(payload);
  } catch (error) {
    return handleApiError(error);
  }
}

