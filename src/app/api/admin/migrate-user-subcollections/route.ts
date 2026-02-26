import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
// Importar dinamicamente para evitar problemas com módulos fora de src
async function getMigrationFunction() {
  // Usar require para importar módulo fora de src
  const migrationModule = await import('../../../../../supabase/migrate-user-subcollections');
  return migrationModule.migrateUserSubcollections;
}

/**
 * Endpoint para migrar subcollections de eventos de um usuário específico
 * 
 * Migra:
 * - pagamentos (de eventos/{eventoId}/pagamentos)
 * - custos (de eventos/{eventoId}/custos)
 * - serviços (de eventos/{eventoId}/servicos)
 * - anexos_eventos (de eventos/{eventoId}/controle_anexos_eventos)
 * - canais_entrada (de controle_users/{userId}/canais_entrada)
 * 
 * Uso via Postman:
 * POST /api/admin/migrate-user-subcollections
 * Headers: x-api-key: <SEED_API_KEY>
 * Body: { "userId": "1AGkVjDbaqWOwk5tg3mHje11PaD2" }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization');
    const isDevMode = process.env.NODE_ENV === 'development';
    
    // Verificar se é admin ou tem API key válida
    if (!session || session.user?.role !== 'admin') {
      if (apiKey) {
        const validApiKey = process.env.SEED_API_KEY || 'dev-seed-key-2024';
        if (apiKey !== validApiKey && !apiKey.includes(validApiKey)) {
          return NextResponse.json({ error: 'API key inválida' }, { status: 401 });
        }
      } else if (!isDevMode) {
        return NextResponse.json({ 
          error: 'Não autorizado. Em produção, use autenticação admin ou forneça x-api-key header' 
        }, { status: 401 });
      }
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'userId é obrigatório e deve ser uma string' },
        { status: 400 }
      );
    }

    console.log(`🚀 Iniciando migração de subcollections para usuário: ${userId}`);

    // Executar migração
    const migrateFn = await getMigrationFunction();
    const result = await migrateFn(userId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Migração concluída para usuário ${userId}`,
        duration: result.duration,
        stats: result.stats,
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error,
        stats: result.stats,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erro ao executar migração:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Erro desconhecido ao executar migração',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

