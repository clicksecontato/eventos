import { NextRequest } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { 
  getAuthenticatedUser,
  handleApiError,
  createApiResponse,
  createErrorResponse,
  getRequestBody
} from '@/lib/api/route-helpers';
import { VariavelContratoService } from '@/lib/services/variavel-contrato-service';

/**
 * GET - Lista variáveis customizadas do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();

    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const variaveis = await variavelRepo.findByUserId(user.id);

    // Serializar datas
    const variaveisSerializadas = variaveis.map(v => ({
      ...v,
      dataCadastro: v.dataCadastro instanceof Date 
        ? v.dataCadastro.toISOString() 
        : v.dataCadastro,
      dataAtualizacao: v.dataAtualizacao instanceof Date 
        ? v.dataAtualizacao.toISOString() 
        : v.dataAtualizacao
    }));

    return createApiResponse(variaveisSerializadas);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST - Cria nova variável customizada
 * 
 * Body:
 * - chave: string (obrigatório) - Ex: "nome_empresa"
 * - label: string (obrigatório) - Ex: "Nome da Empresa"
 * - tipo: 'unica' | 'multipla' (obrigatório)
 * - valorPadrao?: string
 * - descricao?: string
 * - ordem?: number
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    const body = await getRequestBody(request);
    const { chave, label, tipo, valorPadrao, descricao, ordem = 0 } = body;

    if (!chave || !label || !tipo) {
      return createErrorResponse('chave, label e tipo são obrigatórios', 400);
    }

    if (tipo !== 'unica' && tipo !== 'multipla') {
      return createErrorResponse('tipo deve ser "unica" ou "multipla"', 400);
    }

    // Validar formato da chave
    const validacaoChave = VariavelContratoService.validarChave(chave);
    if (!validacaoChave.valido) {
      return createErrorResponse(validacaoChave.erro || 'Chave inválida', 400);
    }

    // Verificar se já existe variável com mesma chave para este usuário
    const variavelRepo = repositoryFactory.getVariavelContratoRepository();
    const existente = await variavelRepo.findByChave(user.id, chave);
    if (existente) {
      return createErrorResponse(`Já existe uma variável com a chave "${chave}"`, 400);
    }

    // Criar variável
    const novaVariavel = await variavelRepo.create({
      userId: user.id,
      chave,
      label,
      tipo,
      valorPadrao,
      descricao,
      ordem,
      ativo: true,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    });

    // Serializar datas
    const variavelSerializada = {
      ...novaVariavel,
      dataCadastro: novaVariavel.dataCadastro instanceof Date 
        ? novaVariavel.dataCadastro.toISOString() 
        : novaVariavel.dataCadastro,
      dataAtualizacao: novaVariavel.dataAtualizacao instanceof Date 
        ? novaVariavel.dataAtualizacao.toISOString() 
        : novaVariavel.dataAtualizacao
    };

    return createApiResponse(variavelSerializada, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
