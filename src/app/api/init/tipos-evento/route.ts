import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { getSupabaseClient } from '@/lib/supabase/client';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { DEFAULT_TIPOS_EVENTO } from '@/types';
import { randomUUID } from 'crypto';

/**
 * API route para inicializar tipos de evento padrão
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
    const tipoEventoRepo = repositoryFactory.getTipoEventoRepository();

    // Verificar se já existem tipos de evento para este usuário
    const existentes = await tipoEventoRepo.findAll(userId);

    if (existentes.length > 0) {
      return NextResponse.json({
        message: 'Tipos de evento já inicializados',
        tipos: existentes.length
      });
    }

    // Usar cliente admin para contornar RLS
    const supabaseAdmin = getSupabaseClient(true);

    const tiposCriados = [];

    for (const tipo of DEFAULT_TIPOS_EVENTO) {
      // Gerar ID único usando UUID
      const id = randomUUID();
      
      const { data, error } = await supabaseAdmin
        .from('tipo_eventos')
        .insert({
          id: id,
          nome: tipo.nome,
          descricao: tipo.descricao ?? '',
          ativo: true,
          user_id: userId,
          data_cadastro: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        // Se for erro de duplicação, ignorar silenciosamente
        if (error.code === '23505') {
          console.log(`Tipo de evento "${tipo.nome}" já existe, ignorando...`);
          tiposCriados.push({ id, nome: tipo.nome }); // Contar como criado
        } else {
          console.error(`Erro ao criar tipo de evento "${tipo.nome}":`, error);
        }
      } else {
        tiposCriados.push(data);
      }
    }

    return NextResponse.json({
      message: 'Tipos de evento inicializados com sucesso',
      tipos: tiposCriados.length
    });
  } catch (error: any) {
    console.error('Erro ao inicializar tipos de evento:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro ao inicializar tipos de evento',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

