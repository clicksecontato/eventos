import { NextRequest } from 'next/server';
import {
  requireAdminOrPremium,
  handleApiError,
  createApiResponse,
  getQueryParams
} from '@/lib/api/route-helpers';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrPremium();

    const query = getQueryParams(request);
    const role = query.get('role');
    const somenteAtivos = query.get('ativos') === 'true';

    const userRepo = repositoryFactory.getUserRepository();
    let users = await userRepo.findAll();

    if (role) {
      users = users.filter(user => user.role === role);
    }

    if (somenteAtivos) {
      users = users.filter(user => user.ativo !== false);
    }

    const usersOrdenados = [...users].sort((a, b) => {
      const dataA = a.dataCadastro ? new Date(a.dataCadastro).getTime() : 0;
      const dataB = b.dataCadastro ? new Date(b.dataCadastro).getTime() : 0;
      return dataB - dataA;
    });

    return createApiResponse({
      users: usersOrdenados
    });
  } catch (error) {
    return handleApiError(error);
  }
}

