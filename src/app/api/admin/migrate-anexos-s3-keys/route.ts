import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-config';
import { arquivoRepository } from '@/lib/repositories/arquivo-repository';
import { repositoryFactory } from '@/lib/repositories/repository-factory';
import { db } from '@/lib/firebase';
import { COLLECTIONS } from '@/lib/firestore/collections';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { AnexoEvento } from '@/types';

interface MigrationStats {
  total: number;
  updated: number;
  notFound: number;
  errors: number;
  details: Array<{
    eventoId: string;
    anexoId: string;
    nome: string;
    status: 'updated' | 'not_found' | 'error';
    error?: string;
  }>;
}

/**
 * Endpoint para migrar s3_key dos anexos do Firestore para o Supabase
 * 
 * Busca todos os anexos do Firestore que têm s3Key e atualiza os registros
 * correspondentes no Supabase (matching por evento_id e nome)
 * 
 * Uso via Postman:
 * POST /api/admin/migrate-anexos-s3-keys
 * Headers: x-api-key: <SEED_API_KEY> (ou autenticação admin)
 * Body (opcional): { "userId": "userId" } - se não fornecido, migra todos os usuários
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

    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    console.log('🚀 Iniciando migração de s3_key dos anexos...');
    if (userId) {
      console.log(`   Usuário específico: ${userId}`);
    } else {
      console.log('   Todos os usuários');
    }

    const startTime = Date.now();
    const stats: MigrationStats = {
      total: 0,
      updated: 0,
      notFound: 0,
      errors: 0,
      details: []
    };

    const anexoEventoRepo = repositoryFactory.getAnexoEventoRepository();

    // Buscar todos os usuários ou usuário específico
    let userIds: string[] = [];
    
    if (userId) {
      userIds = [userId];
    } else {
      // Buscar todos os usuários do Firestore
      const usersCollection = collection(db, COLLECTIONS.USERS);
      const usersSnapshot = await getDocs(usersCollection);
      userIds = usersSnapshot.docs.map(doc => doc.id);
      console.log(`   Encontrados ${userIds.length} usuários`);
    }

    // Para cada usuário, buscar anexos do Firestore
    for (const currentUserId of userIds) {
      try {
        // Buscar todos os eventos do usuário
        const eventosCollection = collection(
          db, 
          COLLECTIONS.USERS, 
          currentUserId, 
          COLLECTIONS.EVENTOS
        );
        const eventosSnapshot = await getDocs(eventosCollection);

        for (const eventoDoc of eventosSnapshot.docs) {
          const eventoId = eventoDoc.id;
          
          // Buscar anexos do evento no Firestore
          const anexosCollection = collection(
            db,
            COLLECTIONS.USERS,
            currentUserId,
            COLLECTIONS.EVENTOS,
            eventoId,
            COLLECTIONS.ANEXOS_EVENTOS
          );
          
          const anexosSnapshot = await getDocs(anexosCollection);

          for (const anexoDoc of anexosSnapshot.docs) {
            stats.total++;
            
            try {
              const firestoreData = anexoDoc.data();
              const s3Key = firestoreData.s3Key;
              
              if (!s3Key) {
                stats.notFound++;
                stats.details.push({
                  eventoId,
                  anexoId: anexoDoc.id,
                  nome: firestoreData.nome || 'Sem nome',
                  status: 'not_found',
                  error: 's3Key não encontrado no Firestore'
                });
                continue;
              }

              // Buscar anexo correspondente no Supabase
              // Primeiro tentar por ID (se foi preservado durante migração)
              let anexoCorrespondente: AnexoEvento | null = await anexoEventoRepo.getAnexoById(anexoDoc.id);
              
              // Se não encontrou por ID, tentar por evento_id + nome
              if (!anexoCorrespondente) {
                const anexosSupabase = await anexoEventoRepo.findByEventoId(eventoId);
                const anexoEncontrado = anexosSupabase.find(
                  anexo => anexo.nome === firestoreData.nome && anexo.eventoId === eventoId
                );
                anexoCorrespondente = anexoEncontrado || null;
              }

              if (!anexoCorrespondente) {
                stats.notFound++;
                stats.details.push({
                  eventoId,
                  anexoId: anexoDoc.id,
                  nome: firestoreData.nome || 'Sem nome',
                  status: 'not_found',
                  error: 'Anexo não encontrado no Supabase (ID e nome não correspondem)'
                });
                continue;
              }

              // Verificar se já tem s3_key
              const anexoComS3Key = anexoCorrespondente as any;
              if (anexoComS3Key.s3Key === s3Key) {
                // Já está atualizado, pular
                continue;
              }

              // Atualizar s3_key no Supabase
              try {
                await anexoEventoRepo.updateS3Key(anexoCorrespondente.id, s3Key);
                
                stats.updated++;
                stats.details.push({
                  eventoId,
                  anexoId: anexoDoc.id,
                  nome: firestoreData.nome || 'Sem nome',
                  status: 'updated'
                });
                
                if (stats.updated % 10 === 0) {
                  console.log(`  ✅ ${stats.updated} anexos atualizados...`);
                }
              } catch (updateError: any) {
                stats.errors++;
                stats.details.push({
                  eventoId,
                  anexoId: anexoDoc.id,
                  nome: firestoreData.nome || 'Sem nome',
                  status: 'error',
                  error: updateError.message || 'Erro desconhecido'
                });
                console.error(`  ❌ Erro ao atualizar anexo ${anexoCorrespondente.id}:`, updateError.message);
              }
            } catch (error: any) {
              stats.errors++;
              stats.details.push({
                eventoId,
                anexoId: anexoDoc.id,
                nome: 'Erro ao processar',
                status: 'error',
                error: error.message || 'Erro desconhecido'
              });
              console.error(`  ❌ Erro ao processar anexo ${anexoDoc.id}:`, error.message);
            }
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar usuário ${currentUserId}:`, error.message);
        stats.errors++;
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ Migração concluída!');
    console.log(`   Total processado: ${stats.total}`);
    console.log(`   Atualizados: ${stats.updated}`);
    console.log(`   Não encontrados: ${stats.notFound}`);
    console.log(`   Erros: ${stats.errors}`);
    console.log(`   Tempo: ${duration}s`);

    return NextResponse.json({
      success: true,
      message: 'Migração de s3_key concluída',
      duration: `${duration}s`,
      stats: {
        total: stats.total,
        updated: stats.updated,
        notFound: stats.notFound,
        errors: stats.errors
      },
      details: stats.details
    });
  } catch (error: any) {
    console.error('❌ Erro ao executar migração:', error);
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

