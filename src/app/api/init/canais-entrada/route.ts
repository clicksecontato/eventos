import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { repositoryFactory } from '@/lib/repositories/repository-factory';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

/**
 * API route para inicializar canais de entrada padrão
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
    const canalEntradaRepo = repositoryFactory.getCanalEntradaRepository();

    // Verificar se já existem canais de entrada para este usuário
    const existentes = await canalEntradaRepo.findAll(userId);

    if (existentes.length > 0) {
      return NextResponse.json({
        message: 'Canais de entrada já inicializados',
        canais: existentes.length
      });
    }

    const defaults = [
      { nome: 'instagram', descricao: 'Origem: Instagram', ativo: true },
      { nome: 'indicação', descricao: 'Origem: Indicação', ativo: true },
      { nome: 'outros', descricao: 'Origem: Outros', ativo: true }
    ];

    const canaisCriados = [];

    for (const item of defaults) {
      const criado = await canalEntradaRepo.createCanalEntrada(userId, {
        nome: item.nome,
        descricao: item.descricao,
        ativo: item.ativo,
        dataCadastro: new Date()
      });
      canaisCriados.push(criado);
    }

    return NextResponse.json({
      message: 'Canais de entrada inicializados com sucesso',
      canais: canaisCriados.length
    });
  } catch (error: unknown) {
    console.error('Erro ao inicializar canais de entrada:', error);
    return NextResponse.json(
      {
        error: getErrorMessage(error) || 'Erro ao inicializar canais de entrada',
        details: String(error)
      },
      { status: 500 }
    );
  }
}

