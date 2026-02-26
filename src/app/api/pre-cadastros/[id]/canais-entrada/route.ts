import { NextRequest, NextResponse } from 'next/server';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { getRouteParams } from '@/lib/api/route-helpers';

/**
 * API route pública para buscar canais de entrada do dono da conta
 * Baseado no pre-cadastro ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await getRouteParams(params);

    if (!id) {
      return NextResponse.json({ error: 'ID do pré-cadastro é obrigatório' }, { status: 400 });
    }

    // Buscar o pre-cadastro para obter o user_id (método público)
    const preCadastroRepo = repositoryFactory.getPreCadastroEventoRepository();
    const preCadastro = await preCadastroRepo.findByIdPublic(id);

    if (!preCadastro) {
      return NextResponse.json({ error: 'Pré-cadastro não encontrado' }, { status: 404 });
    }

    // Verificar se expirou
    if (new Date(preCadastro.dataExpiracao) < new Date()) {
      return NextResponse.json({ error: 'Link expirado' }, { status: 410 });
    }

    // Buscar canais de entrada do dono da conta
    const canalEntradaRepo = repositoryFactory.getCanalEntradaRepository();
    const canaisEntrada = await canalEntradaRepo.findAll(preCadastro.userId);

    // Filtrar apenas os ativos
    const canaisAtivos = canaisEntrada.filter(canal => canal.ativo);

    return NextResponse.json(canaisAtivos);
  } catch (error) {
    console.error('Erro ao buscar canais de entrada:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar canais de entrada' },
      { status: 500 }
    );
  }
}
