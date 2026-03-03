import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

/**
 * API route para inicializar serviços padrão
 * Usa o cliente admin do Supabase para contornar RLS
 */
export async function POST() {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;

    // Usar repository factory para obter o repositório correto
    const tipoServicoRepo = repositoryFactory.getTipoServicoRepository();

    // Verificar se já existem serviços para este usuário
    const existentes = await tipoServicoRepo.findAll(userId);

    if (existentes.length > 0) {
      return NextResponse.json({
        message: 'Serviços já inicializados',
        tipos: existentes.length
      });
    }

    const defaults = [
      { nome: 'totem fotográfico', descricao: 'Serviço de totem fotográfico', ativo: true },
      { nome: 'instaprint', descricao: 'Serviço de Instaprint', ativo: true },
      { nome: 'outros', descricao: 'Outros serviços', ativo: true }
    ];

    const tiposCriados = [];

    for (const item of defaults) {
      const criado = await tipoServicoRepo.createTipoServico(item, userId);
      tiposCriados.push(criado);
    }

    return NextResponse.json({
      message: 'Serviços inicializados com sucesso',
      tipos: tiposCriados.length
    });
  } catch (error: unknown) {
    console.error('Erro ao inicializar serviços:', error);
    return NextResponse.json(
      {
        error: getErrorMessage(error) || 'Erro ao inicializar serviços',
        details: String(error)
      },
      { status: 500 }
    );
  }
}

