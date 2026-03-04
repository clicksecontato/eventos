import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { seedModelosContrato } from '@/lib/seed/modelos-contrato';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro desconhecido';
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await seedModelosContrato();
    return NextResponse.json({ success: true, message: 'Modelos de contrato criados com sucesso' });
  } catch (error: unknown) {
    console.error('Erro ao criar modelos:', error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

