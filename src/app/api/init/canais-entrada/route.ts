import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getSupabaseClient } from '@/lib/supabase/client';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { randomUUID } from 'crypto';

/**
 * API route para inicializar canais de entrada padrão
 * Usa o cliente admin do Supabase para contornar RLS
 */
export async function POST(request: NextRequest) {
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

    // Usar cliente admin para contornar RLS
    const supabaseAdmin = getSupabaseClient(true);

    const defaults = [
      { nome: 'instagram', descricao: 'Origem: Instagram', ativo: true },
      { nome: 'indicação', descricao: 'Origem: Indicação', ativo: true },
      { nome: 'outros', descricao: 'Origem: Outros', ativo: true }
    ];

    const canaisCriados = [];

    for (const item of defaults) {
      // Gerar ID único usando UUID
      const id = randomUUID();
      
      const { data, error } = await supabaseAdmin
        .from('canais_entrada')
        .insert({
          id: id,
          nome: item.nome,
          descricao: item.descricao,
          ativo: item.ativo,
          user_id: userId,
          data_cadastro: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Se for erro de duplicação, ignorar silenciosamente
        if (error.code === '23505') {
          console.log(`Canal de entrada "${item.nome}" já existe, ignorando...`);
          canaisCriados.push({ id, nome: item.nome }); // Contar como criado
        } else {
          console.error(`Erro ao criar canal de entrada "${item.nome}":`, error);
        }
      } else {
        canaisCriados.push(data);
      }
    }

    return NextResponse.json({
      message: 'Canais de entrada inicializados com sucesso',
      canais: canaisCriados.length
    });
  } catch (error: any) {
    console.error('Erro ao inicializar canais de entrada:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro ao inicializar canais de entrada',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

