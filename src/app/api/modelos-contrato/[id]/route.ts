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
import { TemplateService } from '@/lib/services/template-service';
import { VariavelContratoService } from '@/lib/services/variavel-contrato-service';

/**
 * GET - Buscar modelo/template por ID
 * Modelos são globais do sistema (escopo por empresa)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    const modeloRepo = repositoryFactory.getModeloContratoRepository();
    const modelo = await modeloRepo.findById(id);
    
    if (!modelo) {
      return createErrorResponse('Modelo de contrato não encontrado', 404);
    }

    // Serializar datas
    const modeloSerializado = {
      ...modelo,
      dataCadastro: modelo.dataCadastro instanceof Date 
        ? modelo.dataCadastro.toISOString() 
        : modelo.dataCadastro,
      dataAtualizacao: modelo.dataAtualizacao instanceof Date 
        ? modelo.dataAtualizacao.toISOString() 
        : modelo.dataAtualizacao
    };

    return createApiResponse(modeloSerializado);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT - Atualizar template
 * Modelos são globais do sistema (escopo por empresa)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    const body = await getRequestBody(request);
    const { nome, descricao, template, campos, ativo } = body;
    
    const modeloRepo = repositoryFactory.getModeloContratoRepository();
    const modeloExistente = await modeloRepo.findById(id);
    
    if (!modeloExistente) {
      return createErrorResponse('Modelo de contrato não encontrado', 404);
    }

    // Validar template se fornecido
    if (template) {
      const metadados = await VariavelContratoService.obterMetadadosVariaveis(user.id);
      const todasVariaveis = [
        ...metadados.configuracoes,
        ...metadados.customizadas.map(c => c.chave),
        ...metadados.evento
      ];
      
      const validacao = TemplateService.validarPlaceholders(template, todasVariaveis);
      if (!validacao.valido) {
        // Não bloquear, apenas avisar
        console.warn('Template contém variáveis não definidas:', validacao.erros);
      }
    }

    // Atualizar template do sistema
    const atualizado = await modeloRepo.update(id, {
      ...(nome !== undefined && { nome }),
      ...(descricao !== undefined && { descricao }),
      ...(template !== undefined && { template }),
      ...(campos !== undefined && { campos }),
      ...(ativo !== undefined && { ativo }),
      dataAtualizacao: new Date()
    });

    // Serializar datas
    const modeloSerializado = {
      ...atualizado,
      dataCadastro: atualizado.dataCadastro instanceof Date 
        ? atualizado.dataCadastro.toISOString() 
        : atualizado.dataCadastro,
      dataAtualizacao: atualizado.dataAtualizacao instanceof Date 
        ? atualizado.dataAtualizacao.toISOString() 
        : atualizado.dataAtualizacao
    };

    return createApiResponse(modeloSerializado);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE - Deletar template
 * Modelos são globais do sistema (escopo por empresa)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser();
    const { id } = await getRouteParams(params);
    
    const modeloRepo = repositoryFactory.getModeloContratoRepository();
    const modelo = await modeloRepo.findById(id);
    
    if (!modelo) {
      return createErrorResponse('Modelo de contrato não encontrado', 404);
    }

    // Verificar se há contratos usando este template
    const contratoRepo = repositoryFactory.getContratoRepository();
    const contratos = await contratoRepo.findAll(user.id);
    const contratosUsandoTemplate = contratos.filter(c => c.modeloContratoId === id);
    
    if (contratosUsandoTemplate.length > 0) {
      return createErrorResponse(
        `Não é possível deletar este template: existem ${contratosUsandoTemplate.length} contrato(s) usando este template`,
        400
      );
    }

    await modeloRepo.delete(id);

    return createApiResponse({ success: true, message: 'Template deletado com sucesso' });
  } catch (error) {
    return handleApiError(error);
  }
}
