import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { seedModelosContrato } from '@/lib/seed/modelos-contrato';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    await seedModelosContrato();
    return NextResponse.json({ success: true, message: 'Modelos de contrato criados com sucesso' });
  } catch (error: any) {
    console.error('Erro ao criar modelos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

