import { NextRequest, NextResponse } from 'next/server';
import { notificarNovoCadastro } from '@/lib/services/admin-notification-service';

/**
 * POST /api/notificacao-admin/novo-cadastro
 * Notifica o admin sobre um novo cadastro (chamado pelo cliente após registro).
 * Resposta sempre 200 para não impactar o fluxo do usuário; erros são apenas logados.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim() : '';

    if (!nome || !email) {
      return NextResponse.json(
        { ok: false, error: 'nome e email são obrigatórios' },
        { status: 400 }
      );
    }

    await notificarNovoCadastro({
      nome,
      email,
      dataRegistro: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[notificacao-admin/novo-cadastro] Erro ao notificar:', err?.message);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
