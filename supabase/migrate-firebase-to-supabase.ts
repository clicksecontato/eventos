/**
 * Script de Migração: Firebase Firestore → Supabase
 * 
 * Este script migra todos os dados do Firestore para o Supabase
 * 
 * IMPORTANTE: Execute o schema.sql PRIMEIRO (com VARCHAR(255) para todos os IDs)
 * 
 * Uso:
 *   npm run migrate:firebase-to-supabase
 * 
 * Ou:
 *   npx tsx supabase/migrate-firebase-to-supabase.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Configuração
const FIREBASE_PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_CLIENT_EMAIL = process.env.GOOGLE_CREDENTIALS_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.GOOGLE_CREDENTIALS_PRIVATE_KEY?.replace(/\\n/g, '\n');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error('Variáveis do Firebase Admin não configuradas. Configure GOOGLE_CREDENTIALS_CLIENT_EMAIL e GOOGLE_CREDENTIALS_PRIVATE_KEY');
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Variáveis do Supabase não configuradas. Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
}

// Inicializar Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = getFirestore();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Estatísticas
const stats = {
  users: { total: 0, migrated: 0, errors: 0 },
  tipos: { total: 0, migrated: 0, errors: 0 },
  clientes: { total: 0, migrated: 0, errors: 0 },
  eventos: { total: 0, migrated: 0, errors: 0 },
  pagamentos: { total: 0, migrated: 0, errors: 0 },
  custos: { total: 0, migrated: 0, errors: 0 },
  servicos: { total: 0, migrated: 0, errors: 0 },
};

// Helper para converter Firestore Timestamp para ISO string
function convertTimestamp(timestamp: any): string | null {
  if (!timestamp) return null;
  if (timestamp.toDate) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  return null;
}

// Helper para converter número
function convertNumber(value: any): number {
  if (value === null || value === undefined) return 0;
  const num = parseFloat(value);
  return isNaN(num) ? 0 : num;
}

// 1. Migrar Usuários
async function migrateUsers() {
  console.log('\n📦 Migrando Usuários...');
  
  try {
    const usersSnapshot = await db.collection('controle_users').get();
    stats.users.total = usersSnapshot.size;
    
    for (const doc of usersSnapshot.docs) {
      try {
        const data = doc.data();
        const firebaseUid = doc.id; // Firebase UID como string
        
        const supabaseData = {
          id: firebaseUid, // VARCHAR(255) - Firebase UID
          email: data.email || '',
          nome: data.nome || data.name || 'Usuário',
          role: data.role || 'user',
          ativo: data.ativo !== false,
          assinatura: data.assinatura || null,
          data_cadastro: convertTimestamp(data.dataCadastro || data.data_cadastro) || new Date().toISOString(),
          data_atualizacao: convertTimestamp(data.dataAtualizacao || data.data_atualizacao) || new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('users')
          .upsert(supabaseData, { onConflict: 'id' });
        
        if (error) {
          console.error(`  ❌ Erro ao migrar usuário ${firebaseUid}:`, error.message);
          stats.users.errors++;
        } else {
          stats.users.migrated++;
          if (stats.users.migrated % 10 === 0) {
            process.stdout.write(`  ✅ ${stats.users.migrated}/${stats.users.total} usuários migrados\r`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar usuário ${doc.id}:`, error.message);
        stats.users.errors++;
      }
    }
    
    console.log(`\n  ✅ Usuários: ${stats.users.migrated} migrados, ${stats.users.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar usuários:', error.message);
  }
}

// 2. Migrar Tipos (Eventos, Custos, Serviços, Canais)
async function migrateTipos() {
  console.log('\n📦 Migrando Tipos (Eventos, Custos, Serviços, Canais)...');
  
  try {
    const usersSnapshot = await db.collection('controle_users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userRef = db.collection('controle_users').doc(userId);
      
      // Tipos de Evento
      const tiposEventoSnapshot = await userRef.collection('tipo_eventos').get();
      for (const doc of tiposEventoSnapshot.docs) {
        try {
          const data = doc.data();
          const supabaseData = {
            id: doc.id, // VARCHAR(255) - Firestore ID
            user_id: userId,
            nome: data.nome || '',
            descricao: data.descricao || null,
            ativo: data.ativo !== false,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          };
          
          await supabase.from('tipo_eventos').upsert(supabaseData, { onConflict: 'id' });
          stats.tipos.migrated++;
        } catch (error: any) {
          console.error(`  ❌ Erro ao migrar tipo_evento ${doc.id}:`, error.message);
          stats.tipos.errors++;
        }
      }
      
      // Tipos de Custo
      const tiposCustoSnapshot = await userRef.collection('tipo_custos').get();
      for (const doc of tiposCustoSnapshot.docs) {
        try {
          const data = doc.data();
          const supabaseData = {
            id: doc.id, // VARCHAR(255) - Firestore ID
            user_id: userId,
            nome: data.nome || '',
            descricao: data.descricao || null,
            ativo: data.ativo !== false,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          };
          
          await supabase.from('tipo_custos').upsert(supabaseData, { onConflict: 'id' });
          stats.tipos.migrated++;
        } catch (error: any) {
          console.error(`  ❌ Erro ao migrar tipo_custo ${doc.id}:`, error.message);
          stats.tipos.errors++;
        }
      }
      
      // Tipos de Serviço
      const tiposServicoSnapshot = await userRef.collection('tipo_servicos').get();
      for (const doc of tiposServicoSnapshot.docs) {
        try {
          const data = doc.data();
          const supabaseData = {
            id: doc.id, // VARCHAR(255) - Firestore ID
            user_id: userId,
            nome: data.nome || '',
            descricao: data.descricao || null,
            ativo: data.ativo !== false,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          };
          
          await supabase.from('tipo_servicos').upsert(supabaseData, { onConflict: 'id' });
          stats.tipos.migrated++;
        } catch (error: any) {
          console.error(`  ❌ Erro ao migrar tipo_servico ${doc.id}:`, error.message);
          stats.tipos.errors++;
        }
      }
      
      // Canais de Entrada
      const canaisSnapshot = await userRef.collection('canais_entrada').get();
      for (const doc of canaisSnapshot.docs) {
        try {
          const data = doc.data();
          const supabaseData = {
            id: doc.id, // VARCHAR(255) - Firestore ID
            user_id: userId,
            nome: data.nome || '',
            descricao: data.descricao || null,
            ativo: data.ativo !== false,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          };
          
          await supabase.from('canais_entrada').upsert(supabaseData, { onConflict: 'id' });
          stats.tipos.migrated++;
        } catch (error: any) {
          console.error(`  ❌ Erro ao migrar canal_entrada ${doc.id}:`, error.message);
          stats.tipos.errors++;
        }
      }
    }
    
    console.log(`  ✅ Tipos: ${stats.tipos.migrated} migrados, ${stats.tipos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar tipos:', error.message);
  }
}

// 3. Migrar Clientes
async function migrateClientes() {
  console.log('\n📦 Migrando Clientes...');
  
  try {
    const usersSnapshot = await db.collection('controle_users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const clientesSnapshot = await db
        .collection('controle_users')
        .doc(userId)
        .collection('clientes')
        .get();
      
      stats.clientes.total += clientesSnapshot.size;
      
      for (const doc of clientesSnapshot.docs) {
        try {
          const data = doc.data();
          
          // Validar foreign key canal_entrada_id
          let canalEntradaIdValidado = data.canalEntradaId || null;
          if (canalEntradaIdValidado) {
            const { data: canalExists } = await supabase
              .from('canais_entrada')
              .select('id')
              .eq('id', canalEntradaIdValidado)
              .single();
            
            if (!canalExists) {
              console.warn(`  ⚠️  Cliente ${doc.id}: canal_entrada_id ${canalEntradaIdValidado} não encontrado, usando null...`);
              canalEntradaIdValidado = null; // Usar null se não existir
            }
          }
          
          const supabaseData = {
            id: doc.id, // VARCHAR(255) - Firestore ID
            user_id: userId, // VARCHAR(255) - Firebase UID
            nome: data.nome || '',
            cpf: data.cpf || null,
            email: data.email || null,
            telefone: data.telefone || null,
            endereco: data.endereco || null,
            cep: data.cep || null,
            instagram: data.instagram || null,
            canal_entrada_id: canalEntradaIdValidado, // VARCHAR(255) - Firestore ID (validado acima)
            arquivado: data.arquivado || false,
            data_arquivamento: convertTimestamp(data.dataArquivamento) || null,
            motivo_arquivamento: data.motivoArquivamento || null,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from('clientes')
            .upsert(supabaseData, { onConflict: 'id' });
          
          if (error) {
            // Se o erro for de tipo UUID, pode ser que canal_entrada_id ainda esteja como UUID
            if (error.message.includes('uuid') || error.message.includes('invalid input syntax')) {
              console.error(`  ❌ Erro ao migrar cliente ${doc.id}: ${error.message}`);
              console.error(`     Dados:`, JSON.stringify(supabaseData, null, 2));
            } else {
              console.error(`  ❌ Erro ao migrar cliente ${doc.id}:`, error.message);
            }
            stats.clientes.errors++;
          } else {
            stats.clientes.migrated++;
            if (stats.clientes.migrated % 50 === 0) {
              process.stdout.write(`  ✅ ${stats.clientes.migrated}/${stats.clientes.total} clientes migrados\r`);
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar cliente ${doc.id}:`, error.message);
          stats.clientes.errors++;
        }
      }
    }
    
    console.log(`\n  ✅ Clientes: ${stats.clientes.migrated} migrados, ${stats.clientes.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar clientes:', error.message);
  }
}

// 4. Migrar Eventos
async function migrateEventos() {
  console.log('\n📦 Migrando Eventos...');
  
  try {
    const usersSnapshot = await db.collection('controle_users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const eventosSnapshot = await db
        .collection('controle_users')
        .doc(userId)
        .collection('eventos')
        .get();
      
      stats.eventos.total += eventosSnapshot.size;
      
      for (const doc of eventosSnapshot.docs) {
        try {
          const data = doc.data();
          
          // Validar foreign keys antes de inserir
          const clienteId = data.clienteId || null;
          const tipoEventoId = data.tipoEventoId || null;
          
          // Verificar se cliente existe (se clienteId foi fornecido)
          if (clienteId) {
            const { data: clienteExists } = await supabase
              .from('clientes')
              .select('id')
              .eq('id', clienteId)
              .single();
            
            if (!clienteExists) {
              console.warn(`  ⚠️  Evento ${doc.id}: cliente_id ${clienteId} não encontrado, pulando...`);
              stats.eventos.errors++;
              continue;
            }
          }
          
          // Verificar se tipo_evento existe (se tipoEventoId foi fornecido)
          let tipoEventoIdValidado = tipoEventoId;
          if (tipoEventoId) {
            const { data: tipoExists, error: tipoError } = await supabase
              .from('tipo_eventos')
              .select('id')
              .eq('id', tipoEventoId)
              .maybeSingle();
            
            if (tipoError) {
              console.warn(`  ⚠️  Evento ${doc.id}: erro ao verificar tipo_evento ${tipoEventoId}: ${tipoError.message}`);
            }
            
            if (!tipoExists) {
              console.warn(`  ⚠️  Evento ${doc.id}: tipo_evento_id ${tipoEventoId} não encontrado, usando null...`);
              tipoEventoIdValidado = null; // Usar null se não existir
            }
          }
          
          const supabaseData = {
            id: doc.id, // VARCHAR(255) - Firestore ID
            user_id: userId, // VARCHAR(255) - Firebase UID
            cliente_id: clienteId, // VARCHAR(255) - Firestore ID (validado acima)
            nome_evento: data.nomeEvento || null,
            data_evento: convertTimestamp(data.dataEvento) || new Date().toISOString(),
            dia_semana: data.diaSemana || null,
            local: data.local || '',
            endereco: data.endereco || null,
            tipo_evento: data.tipoEvento || '',
            tipo_evento_id: tipoEventoIdValidado, // VARCHAR(255) - Firestore ID (validado acima)
            saida: data.saida || null,
            chegada_no_local: data.chegadaNoLocal || null,
            horario_inicio: data.horarioInicio || null,
            horario_desmontagem: data.horarioDesmontagem || null,
            tempo_evento: data.tempoEvento || null,
            contratante: data.contratante || null,
            numero_convidados: convertNumber(data.numeroConvidados),
            quantidade_mesas: data.quantidadeMesas || null,
            hashtag: data.hashtag || null,
            numero_impressoes: data.numeroImpressoes || null,
            cerimonialista: data.cerimonialista || null,
            observacoes: data.observacoes || null,
            status: data.status || 'Agendado',
            valor_total: convertNumber(data.valorTotal),
            dia_final_pagamento: convertTimestamp(data.diaFinalPagamento) || null,
            arquivado: data.arquivado || false,
            data_arquivamento: convertTimestamp(data.dataArquivamento) || null,
            motivo_arquivamento: data.motivoArquivamento || null,
            google_calendar_event_id: data.googleCalendarEventId || null,
            google_calendar_synced_at: convertTimestamp(data.googleCalendarSyncedAt) || null,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
            data_atualizacao: convertTimestamp(data.dataAtualizacao) || new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from('eventos')
            .upsert(supabaseData, { onConflict: 'id' });
          
          if (error) {
            // Log mais detalhado para debug
            if (error.message.includes('foreign key') || error.message.includes('violates')) {
              console.error(`  ❌ Erro FK ao migrar evento ${doc.id}:`, error.message);
              console.error(`     cliente_id: ${clienteId}, tipo_evento_id: ${tipoEventoIdValidado}`);
            } else if (error.message.includes('uuid') || error.message.includes('invalid input syntax')) {
              console.error(`  ❌ Erro de tipo ao migrar evento ${doc.id}: ${error.message}`);
            } else {
              console.error(`  ❌ Erro ao migrar evento ${doc.id}:`, error.message);
            }
            stats.eventos.errors++;
          } else {
            stats.eventos.migrated++;
            if (stats.eventos.migrated % 50 === 0) {
              process.stdout.write(`  ✅ ${stats.eventos.migrated}/${stats.eventos.total} eventos migrados\r`);
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar evento ${doc.id}:`, error.message);
          stats.eventos.errors++;
        }
      }
    }
    
    console.log(`\n  ✅ Eventos: ${stats.eventos.migrated} migrados, ${stats.eventos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar eventos:', error.message);
  }
}

// 5. Migrar Pagamentos
async function migratePagamentos() {
  console.log('\n📦 Migrando Pagamentos...');
  
  try {
    const pagamentosSnapshot = await db.collection('pagamentos').get();
    stats.pagamentos.total = pagamentosSnapshot.size;
    
    for (const doc of pagamentosSnapshot.docs) {
      try {
        const data = doc.data();
        
        const supabaseData = {
          id: doc.id, // VARCHAR(255) - Firestore ID
          user_id: data.userId || null, // VARCHAR(255) - Firebase UID
          evento_id: data.eventoId || null, // VARCHAR(255) - Firestore ID
          valor: convertNumber(data.valor),
          data_pagamento: convertTimestamp(data.dataPagamento) || new Date().toISOString(),
          forma_pagamento: data.formaPagamento || 'Dinheiro',
          status: data.status || 'Pendente',
          observacoes: data.observacoes || null,
          comprovante: data.comprovante || null,
          anexo_id: data.anexoId || null, // VARCHAR(255) - Firestore ID
          cancelado: data.cancelado || false,
          data_cancelamento: convertTimestamp(data.dataCancelamento) || null,
          motivo_cancelamento: data.motivoCancelamento || null,
          data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          data_atualizacao: convertTimestamp(data.dataAtualizacao) || new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('pagamentos')
          .upsert(supabaseData, { onConflict: 'id' });
        
        if (error) {
          console.error(`  ❌ Erro ao migrar pagamento ${doc.id}:`, error.message);
          stats.pagamentos.errors++;
        } else {
          stats.pagamentos.migrated++;
          if (stats.pagamentos.migrated % 100 === 0) {
            process.stdout.write(`  ✅ ${stats.pagamentos.migrated}/${stats.pagamentos.total} pagamentos migrados\r`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar pagamento ${doc.id}:`, error.message);
        stats.pagamentos.errors++;
      }
    }
    
    console.log(`\n  ✅ Pagamentos: ${stats.pagamentos.migrated} migrados, ${stats.pagamentos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar pagamentos:', error.message);
  }
}

// 6. Migrar Custos
async function migrateCustos() {
  console.log('\n📦 Migrando Custos...');
  
  try {
    const custosSnapshot = await db.collection('custos').get();
    stats.custos.total = custosSnapshot.size;
    
    for (const doc of custosSnapshot.docs) {
      try {
        const data = doc.data();
        
        const supabaseData = {
          id: doc.id, // VARCHAR(255) - Firestore ID
          user_id: data.userId || null, // VARCHAR(255) - Firebase UID
          evento_id: data.eventoId || null, // VARCHAR(255) - Firestore ID
          tipo_custo_id: data.tipoCustoId || null, // VARCHAR(255) - Firestore ID
          valor: convertNumber(data.valor),
          quantidade: data.quantidade || 1,
          observacoes: data.observacoes || null,
          removido: data.removido || false,
          data_remocao: convertTimestamp(data.dataRemocao) || null,
          motivo_remocao: data.motivoRemocao || null,
          data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('custos')
          .upsert(supabaseData, { onConflict: 'id' });
        
        if (error) {
          console.error(`  ❌ Erro ao migrar custo ${doc.id}:`, error.message);
          stats.custos.errors++;
        } else {
          stats.custos.migrated++;
          if (stats.custos.migrated % 100 === 0) {
            process.stdout.write(`  ✅ ${stats.custos.migrated}/${stats.custos.total} custos migrados\r`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar custo ${doc.id}:`, error.message);
        stats.custos.errors++;
      }
    }
    
    console.log(`\n  ✅ Custos: ${stats.custos.migrated} migrados, ${stats.custos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar custos:', error.message);
  }
}

// 7. Migrar Serviços
async function migrateServicos() {
  console.log('\n📦 Migrando Serviços...');
  
  try {
    const servicosSnapshot = await db.collection('servicos').get();
    stats.servicos.total = servicosSnapshot.size;
    
    for (const doc of servicosSnapshot.docs) {
      try {
        const data = doc.data();
        
        const supabaseData = {
          id: doc.id, // VARCHAR(255) - Firestore ID
          user_id: data.userId || null, // VARCHAR(255) - Firebase UID
          evento_id: data.eventoId || null, // VARCHAR(255) - Firestore ID
          tipo_servico_id: data.tipoServicoId || null, // VARCHAR(255) - Firestore ID
          observacoes: data.observacoes || null,
          removido: data.removido || false,
          data_remocao: convertTimestamp(data.dataRemocao) || null,
          motivo_remocao: data.motivoRemocao || null,
          data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('servicos_evento')
          .upsert(supabaseData, { onConflict: 'id' });
        
        if (error) {
          console.error(`  ❌ Erro ao migrar serviço ${doc.id}:`, error.message);
          stats.servicos.errors++;
        } else {
          stats.servicos.migrated++;
          if (stats.servicos.migrated % 100 === 0) {
            process.stdout.write(`  ✅ ${stats.servicos.migrated}/${stats.servicos.total} serviços migrados\r`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar serviço ${doc.id}:`, error.message);
        stats.servicos.errors++;
      }
    }
    
    console.log(`\n  ✅ Serviços: ${stats.servicos.migrated} migrados, ${stats.servicos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar serviços:', error.message);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando migração Firebase → Supabase...\n');
  console.log('⚠️  Certifique-se de que:');
  console.log('   1. O schema.sql foi executado (com VARCHAR(255) para todos os IDs)');
  console.log('   2. As variáveis de ambiente estão configuradas');
  console.log('   3. Você tem acesso ao Firebase Admin SDK\n');
  
  const startTime = Date.now();
  
  try {
    // Ordem de migração (respeitando dependências)
    await migrateUsers();
    await migrateTipos(); // Tipos antes de clientes/eventos
    await migrateClientes();
    await migrateEventos();
    await migratePagamentos();
    await migrateCustos();
    await migrateServicos();
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migração concluída!');
    console.log('='.repeat(50));
    console.log('\n📊 Estatísticas:');
    console.log(`   Usuários: ${stats.users.migrated}/${stats.users.total} (${stats.users.errors} erros)`);
    console.log(`   Tipos: ${stats.tipos.migrated} migrados (${stats.tipos.errors} erros)`);
    console.log(`   Clientes: ${stats.clientes.migrated}/${stats.clientes.total} (${stats.clientes.errors} erros)`);
    console.log(`   Eventos: ${stats.eventos.migrated}/${stats.eventos.total} (${stats.eventos.errors} erros)`);
    console.log(`   Pagamentos: ${stats.pagamentos.migrated}/${stats.pagamentos.total} (${stats.pagamentos.errors} erros)`);
    console.log(`   Custos: ${stats.custos.migrated}/${stats.custos.total} (${stats.custos.errors} erros)`);
    console.log(`   Serviços: ${stats.servicos.migrated}/${stats.servicos.total} (${stats.servicos.errors} erros)`);
    console.log(`\n⏱️  Tempo total: ${duration.toFixed(2)}s\n`);
    
  } catch (error: any) {
    console.error('\n❌ Erro fatal na migração:', error);
    process.exit(1);
  }
}

// Executar
if (require.main === module) {
  main().catch(console.error);
}

export { main as migrateFirebaseToSupabase };
