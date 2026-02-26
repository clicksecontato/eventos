import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { TemplateService } from '@/lib/services/template-service';
import { VariavelContratoService } from '@/lib/services/variavel-contrato-service';

/**
 * GET - Lista modelos ativos: globais + modelos do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const modeloRepo = repositoryFactory.getModeloContratoRepository();
    // Buscar modelos globais + modelos do usuário
    const modelos = await modeloRepo.findAtivos(user.id);

    // Serializar datas manualmente para evitar problemas de JSON
    const modelosSerializados = modelos.map(modelo => ({
      ...modelo,
      dataCadastro: modelo.dataCadastro instanceof Date 
        ? modelo.dataCadastro.toISOString() 
        : modelo.dataCadastro,
      dataAtualizacao: modelo.dataAtualizacao instanceof Date 
        ? modelo.dataAtualizacao.toISOString() 
        : modelo.dataAtualizacao
    }));

    return createApiResponse(modelosSerializados);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST - Criar novo template personalizado do usuário
 * 
 * Body:
 * - nome: string (obrigatório)
 * - descricao?: string
 * - template: string (obrigatório)
 * - campos?: CampoContrato[] (opcional, para compatibilidade)
 * - ativo?: boolean (default: true)
 * 
 * O template será criado como privado do usuário (userId será preenchido automaticamente)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    const { nome, descricao, template, campos = [], ativo = true } = body;

    if (!nome || !template) {
      return createErrorResponse('nome e template são obrigatórios', 400);
    }

    const modeloRepo = repositoryFactory.getModeloContratoRepository();
    
    // Validar template: verificar se todas as variáveis usadas estão disponíveis
    const metadados = await VariavelContratoService.obterMetadadosVariaveis(user.id);
    const todasVariaveis = [
      ...metadados.configuracoes,
      ...metadados.customizadas.map(c => c.chave),
      ...metadados.evento
    ];
    
    const validacao = TemplateService.validarPlaceholders(template, todasVariaveis);
    if (!validacao.valido) {
      // Não bloquear, apenas avisar (variáveis podem ser preenchidas depois)
      console.warn('Template contém variáveis não definidas:', validacao.erros);
    }

    // Criar template como privado do usuário
    const novoTemplate = await modeloRepo.create({
      nome,
      descricao,
      template,
      campos, // Manter para compatibilidade
      ativo,
      userId: user.id, // Template privado do usuário
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    });

    // Serializar datas
    const templateSerializado = {
      ...novoTemplate,
      dataCadastro: novoTemplate.dataCadastro instanceof Date 
        ? novoTemplate.dataCadastro.toISOString() 
        : novoTemplate.dataCadastro,
      dataAtualizacao: novoTemplate.dataAtualizacao instanceof Date 
        ? novoTemplate.dataAtualizacao.toISOString() 
        : novoTemplate.dataAtualizacao
    };

    return createApiResponse(templateSerializado, 201);
  } catch (error) {
    return handleApiError(error);
  }
}

