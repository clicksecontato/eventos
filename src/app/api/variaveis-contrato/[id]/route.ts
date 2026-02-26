import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody,
  getRouteParams
} from '@/lib/api/route-helpers';
import { VariavelContratoService } from '@/lib/services/variavel-contrato-service';

/**
 * GET - Buscar variável por ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const variavel = await variavelRepo.findById(id);
    
    if (!variavel) {
      return createErrorResponse('Variável não encontrada', 404);
    }

    // Verificar se pertence ao usuário
    if (variavel.userId !== user.id) {
      return createErrorResponse('Acesso negado: esta variável pertence a outro usuário', 403);
    }

    // Serializar datas
    const variavelSerializada = {
      ...variavel,
      dataCadastro: variavel.dataCadastro instanceof Date 
        ? variavel.dataCadastro.toISOString() 
        : variavel.dataCadastro,
      dataAtualizacao: variavel.dataAtualizacao instanceof Date 
        ? variavel.dataAtualizacao.toISOString() 
        : variavel.dataAtualizacao
    };

    return createApiResponse(variavelSerializada);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT - Atualizar variável
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const body = await getRequestBody(request);
    const { chave, label, tipo, valorPadrao, descricao, ordem, ativo } = body;
    
    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const variavelExistente = await variavelRepo.findById(id);
    
    if (!variavelExistente) {
      return createErrorResponse('Variável não encontrada', 404);
    }

    // Verificar permissão
    if (variavelExistente.userId !== user.id) {
      return createErrorResponse('Acesso negado: esta variável pertence a outro usuário', 403);
    }

    // Se estiver alterando a chave, validar e verificar duplicatas
    if (chave && chave !== variavelExistente.chave) {
      const validacaoChave = VariavelContratoService.validarChave(chave);
      if (!validacaoChave.valido) {
        return createErrorResponse(validacaoChave.erro || 'Chave inválida', 400);
      }

      const existente = await variavelRepo.findByChave(user.id, chave);
      if (existente && existente.id !== id) {
        return createErrorResponse(`Já existe uma variável com a chave "${chave}"`, 400);
      }
    }

    // Validar tipo se fornecido
    if (tipo && tipo !== 'unica' && tipo !== 'multipla') {
      return createErrorResponse('tipo deve ser "unica" ou "multipla"', 400);
    }

    // Atualizar
    const atualizada = await variavelRepo.update(id, {
      ...(chave !== undefined && { chave }),
      ...(label !== undefined && { label }),
      ...(tipo !== undefined && { tipo }),
      ...(valorPadrao !== undefined && { valorPadrao }),
      ...(descricao !== undefined && { descricao }),
      ...(ordem !== undefined && { ordem }),
      ...(ativo !== undefined && { ativo }),
      dataAtualizacao: new Date()
    });

    // Serializar datas
    const variavelSerializada = {
      ...atualizada,
      dataCadastro: atualizada.dataCadastro instanceof Date 
        ? atualizada.dataCadastro.toISOString() 
        : atualizada.dataCadastro,
      dataAtualizacao: atualizada.dataAtualizacao instanceof Date 
        ? atualizada.dataAtualizacao.toISOString() 
        : atualizada.dataAtualizacao
    };

    return createApiResponse(variavelSerializada);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE - Deletar variável
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const variavel = await variavelRepo.findById(id);
    
    if (!variavel) {
      return createErrorResponse('Variável não encontrada', 404);
    }

    // Verificar permissão
    if (variavel.userId !== user.id) {
      return createErrorResponse('Acesso negado: esta variável pertence a outro usuário', 403);
    }

    await variavelRepo.delete(id);

    return createApiResponse({ success: true, message: 'Variável deletada com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
