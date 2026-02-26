import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { FuncionalidadeService } from '../services/funcionalidade-service';

/**
 * Valida se usuário tem permissão para acessar uma funcionalidade
 */
export async function validateFuncionalidade(
  codigoFuncionalidade: string,
  userId: string
): Promise<{ autorizado: boolean; error?: string }> {
  const funcionalidadeService = new FuncionalidadeService();
  const temPermissao = await funcionalidadeService.verificarPermissao(userId, codigoFuncionalidade);

  if (!temPermissao) {
    return {
      autorizado: false,
      error: `Seu plano não permite acessar esta funcionalidade`
    };
  }

  return { autorizado: true };
}

/**
 * Valida se usuário pode criar mais itens de um tipo (eventos, clientes, etc)
 */
export async function validateLimite(
  tipo: 'eventos' | 'clientes',
  userId: string
): Promise<{ autorizado: boolean; error?: string; detalhes?: any }> {
  const funcionalidadeService = new FuncionalidadeService();
  const resultado = await funcionalidadeService.verificarPodeCriar(userId, tipo);

  if (!resultado.pode) {
    return {
      autorizado: false,
      error: resultado.motivo || `Limite de ${tipo} atingido`,
      detalhes: {
        limite: resultado.limite,
        usado: resultado.usado,
        restante: resultado.restante
      }
    };
  }

  return { autorizado: true };
}

/**
 * Wrapper para API routes que valida plano
 */
export async function withPlanoValidation(
  request: NextRequest,
  handler: (userId: string, request: NextRequest) => Promise<NextResponse>,
  options?: {
    funcionalidade?: string;
    limite?: 'eventos' | 'clientes';
  }
): Promise<NextResponse> {
  try {
    // Obter usuário autenticado
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const funcionalidadeService = new FuncionalidadeService();

    // Validar funcionalidade se especificada
    if (options?.funcionalidade) {
      const temPermissao = await funcionalidadeService.verificarPermissao(userId, options.funcionalidade);
      if (!temPermissao) {
        return NextResponse.json(
          { error: 'Seu plano não permite esta funcionalidade' },
          { status: 403 }
        );
      }
    }

    // Validar limite se especificado
    if (options?.limite) {
      const resultado = await funcionalidadeService.verificarPodeCriar(userId, options.limite);
      if (!resultado.pode) {
        return NextResponse.json(
          {
            error: resultado.motivo || `Limite de ${options.limite} atingido`,
            limite: resultado.limite,
            usado: resultado.usado,
            restante: resultado.restante
          },
          { status: 403 }
        );
      }
    }

    // Executar handler se todas validações passaram
    return handler(userId, request);
  } catch (error: any) {
    console.error('Erro na validação de plano:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao validar plano' },
      { status: 500 }
    );
  }
}

