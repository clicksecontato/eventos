import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { PlanoRepository } from '@/lib/repositories/plano-repository';

export async function POST(request: NextRequest) {
  try {
    // Auth: allow admin session or x-api-key in dev
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization') || '';
    const isDev = process.env.NODE_ENV === 'development';
    const session = await getServerSession(authOptions);
    const isAdmin = !!session && (session as any)?.user?.role === 'admin';

    if (!isAdmin) {
      const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
      if (!apiKey || (!apiKey.includes(validApiKey) && apiKey !== validApiKey)) {
        if (!isDev) {
          return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
      }
    }

    const { searchParams } = new URL(request.url);
    const sourceCode = (searchParams.get('source') || 'BASICO_MENSAL').trim();
    const newCode = (searchParams.get('code') || '123').trim();
    const newName = (searchParams.get('name') || 'Basico Sandbox').trim();

    const repo = new PlanoRepository();

    // Check if target already exists
    const existingTarget = await repo.findByCodigoHotmart(newCode);
    if (existingTarget) {
      return NextResponse.json({
        ok: true,
        message: 'Plano sandbox já existe',
        plano: {
          id: existingTarget.id,
          nome: existingTarget.nome,
          codigoHotmart: existingTarget.codigoHotmart,
          funcionalidades: existingTarget.funcionalidades || []
        }
      });
    }

    // Load source plan
    const source = await repo.findByCodigoHotmart(sourceCode);
    if (!source) {
      return NextResponse.json({
        ok: false,
        error: `Plano de origem não encontrado: ${sourceCode}`
      }, { status: 404 });
    }

    // Create clone with new code/name, same funcionalidades and limits
    const created = await repo.create({
      nome: newName,
      descricao: source.descricao,
      codigoHotmart: newCode,
      funcionalidades: Array.isArray(source.funcionalidades) ? [...source.funcionalidades] : [],
      preco: source.preco,
      intervalo: source.intervalo,
      ativo: true,
      destaque: !!source.destaque,
      limiteEventos: source.limiteEventos,
      limiteClientes: source.limiteClientes,
      limiteUsuarios: source.limiteUsuarios,
      dataCadastro: new Date(),
      dataAtualizacao: new Date()
    });

    return NextResponse.json({
      ok: true,
      message: `Plano sandbox criado a partir de ${sourceCode} com codigoHotmart=${newCode}`,
      plano: {
        id: created.id,
        nome: created.nome,
        codigoHotmart: created.codigoHotmart,
        funcionalidades: created.funcionalidades || []
      }
    });
  } catch (err: any) {
    console.error('Erro ao criar plano sandbox:', err);
    return NextResponse.json({ error: err?.message || 'Erro ao criar plano sandbox' }, { status: 500 });
  }
}


