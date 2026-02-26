import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse
} from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const configRepo = repositoryFactory.getConfiguracaoContratoRepository();
    const camposFixos = await configRepo.getCamposFixos(user.id);

    return createApiResponse(camposFixos);
  } catch (error) {
    return handleApiError(error);
  }
}

