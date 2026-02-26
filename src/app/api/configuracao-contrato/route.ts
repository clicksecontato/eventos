import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  getRequestBody
} from '@/lib/api/route-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const configRepo = repositoryFactory.getConfiguracaoContratoRepository();
    const config = await configRepo.findByUserId(user.id);

    return createApiResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    
    const configRepo = repositoryFactory.getConfiguracaoContratoRepository();
    const config = await configRepo.createOrUpdate(user.id, body);

    return createApiResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

