import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { DEFAULT_TIPOS_EVENTO } from '@/types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

/**
 * API route para inicializar tipos de evento padrão
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
    const tipoEventoRepo = repositoryFactory.getTipoEventoRepository();

    // Verificar se já existem tipos de evento para este usuário
    const existentes = await tipoEventoRepo.findAll(userId);

    if (existentes.length > 0) {
      return NextResponse.json({
        message: 'Tipos de evento já inicializados',
        tipos: existentes.length
      });
    }

    const tiposCriados = [];

    for (const tipo of DEFAULT_TIPOS_EVENTO) {
      const criado = await tipoEventoRepo.createTipoEvento({
        nome: tipo.nome,
        descricao: tipo.descricao ?? '',
        ativo: true,
        dataCadastro: new Date()
      }, userId);
      tiposCriados.push(criado);
    }

    return NextResponse.json({
      message: 'Tipos de evento inicializados com sucesso',
      tipos: tiposCriados.length
    });
  } catch (error: unknown) {
    console.error('Erro ao inicializar tipos de evento:', error);
    return NextResponse.json(
      {
        error: getErrorMessage(error) || 'Erro ao inicializar tipos de evento',
        details: String(error)
      },
      { status: 500 }
    );
  }
}

