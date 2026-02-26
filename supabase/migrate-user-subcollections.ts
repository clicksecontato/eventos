/**
 * Script de Migração: Subcollections de Eventos do Firestore → Supabase
 * 
 * Este script migra as subcollections de eventos de um usuário específico:
 * - pagamentos (de eventos/{eventoId}/pagamentos)
 * - custos (de eventos/{eventoId}/custos)
 * - serviços (de eventos/{eventoId}/servicos)
 * - anexos_eventos (de eventos/{eventoId}/controle_anexos_eventos)
 * - canais_entrada (de controle_users/{userId}/canais_entrada)
 * 
 * IMPORTANTE: 
 * - Usa SUPABASE_SERVICE_ROLE_KEY para bypassar RLS
 * - Insere apenas novos registros (não faz upsert)
 * - Extrai userId e eventoId do path do Firestore
 * 
 * Uso:
 *   npx tsx supabase/migrate-user-subcollections.ts <userId>
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
  clientes: { total: 0, inserted: 0, skipped: 0, errors: 0 },
  eventos: { total: 0, inserted: 0, skipped: 0, errors: 0 },
  pagamentos: { total: 0, inserted: 0, skipped: 0, errors: 0 },
  custos: { total: 0, inserted: 0, skipped: 0, errors: 0 },
  servicos: { total: 0, inserted: 0, skipped: 0, errors: 0 },
  anexos_eventos: { total: 0, inserted: 0, skipped: 0, errors: 0 },
  canais_entrada: { total: 0, inserted: 0, skipped: 0, errors: 0 },
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

// Helper para normalizar tipo de anexo
// Mapeia valores do Firestore para valores permitidos no Supabase
function normalizeTipoAnexo(tipo: any): 'PDF' | 'Imagem' | 'Documento' | 'Outro' {
  if (!tipo || typeof tipo !== 'string') return 'Outro';
  
  const tipoLower = tipo.toLowerCase().trim();
  
  // Mapeamento de valores comuns
  if (tipoLower.includes('pdf') || tipoLower === 'pdf') {
    return 'PDF';
  }
  
  if (tipoLower.includes('imagem') || tipoLower.includes('image') || 
      tipoLower.includes('jpg') || tipoLower.includes('jpeg') || 
      tipoLower.includes('png') || tipoLower.includes('gif') || 
      tipoLower.includes('webp') || tipoLower.includes('bmp')) {
    return 'Imagem';
  }
  
  if (tipoLower.includes('documento') || tipoLower.includes('document') ||
      tipoLower.includes('doc') || tipoLower.includes('docx') ||
      tipoLower.includes('txt') || tipoLower.includes('rtf')) {
    return 'Documento';
  }
  
  // Valores exatos permitidos
  if (tipo === 'PDF' || tipo === 'Imagem' || tipo === 'Documento' || tipo === 'Outro') {
    return tipo as 'PDF' | 'Imagem' | 'Documento' | 'Outro';
  }
  
  // Padrão: Outro
  return 'Outro';
}

// Verificar se registro já existe no Supabase
async function recordExists(table: string, id: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('id', id)
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error(`  ⚠️  Erro ao verificar existência de ${table}.${id}:`, error.message);
    return false; // Em caso de erro, tentar inserir
  }
  
  return !!data;
}

// Cache de eventos já verificados/migrados durante a execução
const eventosCache = new Map<string, boolean>();

// Cache de clientes já verificados/migrados durante a execução
const clientesCache = new Map<string, boolean>();

// Verificar se evento existe no Supabase (com cache)
async function eventoExists(eventoId: string): Promise<boolean> {
  // Verificar cache primeiro
  if (eventosCache.has(eventoId)) {
    return eventosCache.get(eventoId)!;
  }
  
  const { data, error } = await supabase
    .from('eventos')
    .select('id')
    .eq('id', eventoId)
    .limit(1)
    .single();
  
  const exists = !error && !!data;
  eventosCache.set(eventoId, exists);
  
  return exists;
}

// Verificar se cliente existe no Supabase (com cache)
async function clienteExists(clienteId: string): Promise<boolean> {
  // Verificar cache primeiro
  if (clientesCache.has(clienteId)) {
    return clientesCache.get(clienteId)!;
  }
  
  const { data, error } = await supabase
    .from('clientes')
    .select('id')
    .eq('id', clienteId)
    .limit(1)
    .single();
  
  const exists = !error && !!data;
  clientesCache.set(clienteId, exists);
  
  return exists;
}

// Migrar um cliente específico do Firestore para o Supabase
// Retorna o ID do cliente no Supabase (pode ser diferente do Firestore se já existir com mesmo CPF)
async function migrateCliente(userId: string, clienteId: string): Promise<string | null> {
  try {
    // Verificar se já existe pelo ID (com cache)
    if (await clienteExists(clienteId)) {
      return clienteId; // Já existe com esse ID
    }
    
    // Buscar cliente no Firestore
    const clienteDoc = await db
      .collection('controle_users')
      .doc(userId)
      .collection('clientes')
      .doc(clienteId)
      .get();
    
    if (!clienteDoc.exists) {
      console.warn(`  ⚠️  Cliente ${clienteId} não encontrado no Firestore`);
      clientesCache.set(clienteId, false);
      return null;
    }
    
    const data = clienteDoc.data();
    
    // Se o cliente tem CPF, verificar se já existe no Supabase com mesmo CPF
    if (data?.cpf) {
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('user_id', userId)
        .eq('cpf', data.cpf)
        .single();
      
      if (clienteExistente) {
        console.warn(`  ⚠️  Cliente ${clienteId} já existe no Supabase com ID ${clienteExistente.id} (mesmo CPF) - usando cliente existente`);
        // Atualizar cache com ambos os IDs
        clientesCache.set(clienteId, true);
        clientesCache.set(clienteExistente.id, true);
        return clienteExistente.id; // Retornar o ID existente
      }
    }
    
    // Validar foreign key canal_entrada_id
    let canalEntradaIdValidado = data?.canalEntradaId || null;
    if (canalEntradaIdValidado) {
      const { data: canalExists } = await supabase
        .from('canais_entrada')
        .select('id')
        .eq('id', canalEntradaIdValidado)
        .single();
      
      if (!canalExists) {
        console.warn(`  ⚠️  Cliente ${clienteId}: canal_entrada_id ${canalEntradaIdValidado} não encontrado, usando null...`);
        canalEntradaIdValidado = null;
      }
    }
    
    const supabaseData = {
      id: clienteId,
      user_id: userId,
      nome: data?.nome || '',
      cpf: data?.cpf || null,
      email: data?.email || null,
      telefone: data?.telefone || null,
      endereco: data?.endereco || null,
      cep: data?.cep || null,
      instagram: data?.instagram || null,
      canal_entrada_id: canalEntradaIdValidado,
      arquivado: data?.arquivado || false,
      data_arquivamento: convertTimestamp(data?.dataArquivamento) || null,
      motivo_arquivamento: data?.motivoArquivamento || null,
      data_cadastro: convertTimestamp(data?.dataCadastro) || new Date().toISOString(),
    };
    
    // Tentar inserir
    const { error } = await supabase
      .from('clientes')
      .insert(supabaseData);
    
    if (error) {
      // Se o erro for de constraint única de CPF, buscar cliente existente
      if (error.message.includes('idx_clientes_user_cpf_unique') || error.message.includes('duplicate key')) {
        if (data?.cpf) {
          const { data: clienteExistente } = await supabase
            .from('clientes')
            .select('id')
            .eq('user_id', userId)
            .eq('cpf', data.cpf)
            .single();
          
          if (clienteExistente) {
            console.warn(`  ⚠️  Cliente ${clienteId} já existe com ID ${clienteExistente.id} (mesmo CPF) - usando cliente existente`);
            // Atualizar cache
            clientesCache.set(clienteId, true);
            clientesCache.set(clienteExistente.id, true);
            return clienteExistente.id;
          }
        }
        console.error(`  ❌ Erro ao migrar cliente ${clienteId}: ${error.message}`);
        clientesCache.set(clienteId, false);
        return null;
      }
      console.error(`  ❌ Erro ao migrar cliente ${clienteId}:`, error.message);
      clientesCache.set(clienteId, false);
      return null;
    }
    
    // Atualizar cache para indicar que foi migrado com sucesso
    clientesCache.set(clienteId, true);
    console.log(`  ✅ Cliente ${clienteId} migrado com sucesso`);
    return clienteId; // Retornar o ID usado
  } catch (error: any) {
    console.error(`  ❌ Erro ao processar cliente ${clienteId}:`, error.message);
    clientesCache.set(clienteId, false);
    return null;
  }
}

// Migrar um evento específico do Firestore para o Supabase
async function migrateEvento(userId: string, eventoId: string, eventoData: any): Promise<boolean> {
  try {
    // Verificar se já existe (com cache)
    if (await eventoExists(eventoId)) {
      return true; // Já existe, não precisa migrar
    }
    
    // Atualizar cache para indicar que está sendo migrado
    eventosCache.set(eventoId, false);

    // Validar foreign keys antes de inserir
    const clienteId = eventoData.clienteId || null;
    const tipoEventoId = eventoData.tipoEventoId || null;
    
    // Se cliente não existe, migrar primeiro
    let clienteIdFinal = clienteId;
    if (clienteId) {
      if (!await clienteExists(clienteId)) {
        console.log(`  📦 Cliente ${clienteId} não existe no Supabase, migrando cliente primeiro...`);
        const clienteIdMigrado = await migrateCliente(userId, clienteId);
        if (!clienteIdMigrado) {
          console.error(`  ❌ Evento ${eventoId}: não foi possível migrar cliente ${clienteId} - não é possível migrar evento sem cliente`);
          eventosCache.set(eventoId, false);
          return false;
        }
        // Usar o ID retornado (pode ser diferente se já existia com mesmo CPF)
        clienteIdFinal = clienteIdMigrado;
        stats.clientes.inserted++;
      }
    } else {
      console.error(`  ❌ Evento ${eventoId}: não tem cliente_id - eventos precisam de um cliente`);
      eventosCache.set(eventoId, false);
      return false;
    }
    
    // Verificar se tipo_evento existe (se tipoEventoId foi fornecido)
    let tipoEventoIdValidado = tipoEventoId;
    if (tipoEventoId) {
      const { data: tipoExists } = await supabase
        .from('tipo_eventos')
        .select('id')
        .eq('id', tipoEventoId)
        .maybeSingle();
      
      if (!tipoExists) {
        console.warn(`  ⚠️  Evento ${eventoId}: tipo_evento_id ${tipoEventoId} não encontrado, usando null...`);
        tipoEventoIdValidado = null;
      }
    }
    
    const supabaseData = {
      id: eventoId,
      user_id: userId,
      cliente_id: clienteIdFinal, // Usar o ID final (pode ser diferente do Firestore)
      nome_evento: eventoData.nomeEvento || null,
      data_evento: convertTimestamp(eventoData.dataEvento) || new Date().toISOString(),
      dia_semana: eventoData.diaSemana || null,
      local: eventoData.local || '',
      endereco: eventoData.endereco || null,
      tipo_evento: eventoData.tipoEvento || '',
      tipo_evento_id: tipoEventoIdValidado,
      saida: eventoData.saida || null,
      chegada_no_local: eventoData.chegadaNoLocal || null,
      horario_inicio: eventoData.horarioInicio || null,
      horario_desmontagem: eventoData.horarioDesmontagem || null,
      tempo_evento: eventoData.tempoEvento || null,
      contratante: eventoData.contratante || null,
      numero_convidados: convertNumber(eventoData.numeroConvidados),
      quantidade_mesas: eventoData.quantidadeMesas || null,
      hashtag: eventoData.hashtag || null,
      numero_impressoes: eventoData.numeroImpressoes || null,
      cerimonialista: eventoData.cerimonialista || null,
      observacoes: eventoData.observacoes || null,
      status: eventoData.status || 'Agendado',
      valor_total: convertNumber(eventoData.valorTotal),
      dia_final_pagamento: convertTimestamp(eventoData.diaFinalPagamento) || null,
      arquivado: eventoData.arquivado || false,
      data_arquivamento: convertTimestamp(eventoData.dataArquivamento) || null,
      motivo_arquivamento: eventoData.motivoArquivamento || null,
      google_calendar_event_id: eventoData.googleCalendarEventId || null,
      google_calendar_synced_at: convertTimestamp(eventoData.googleCalendarSyncedAt) || null,
      data_cadastro: convertTimestamp(eventoData.dataCadastro) || new Date().toISOString(),
      data_atualizacao: convertTimestamp(eventoData.dataAtualizacao) || new Date().toISOString(),
    };
    
    const { error } = await supabase
      .from('eventos')
      .insert(supabaseData);
    
    if (error) {
      console.error(`  ❌ Erro ao migrar evento ${eventoId}:`, error.message);
      eventosCache.set(eventoId, false);
      return false;
    }
    
    // Atualizar cache para indicar que foi migrado com sucesso
    eventosCache.set(eventoId, true);
    console.log(`  ✅ Evento ${eventoId} migrado com sucesso`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Erro ao processar evento ${eventoId}:`, error.message);
    return false;
  }
}

// Migrar Pagamentos
async function migratePagamentos(userId: string) {
  console.log('\n💳 Migrando Pagamentos...');
  
  try {
    const eventosSnapshot = await db
      .collection('controle_users')
      .doc(userId)
      .collection('eventos')
      .get();
    
    for (const eventoDoc of eventosSnapshot.docs) {
      const eventoId = eventoDoc.id;
      const pagamentosSnapshot = await eventoDoc.ref.collection('pagamentos').get();
      stats.pagamentos.total += pagamentosSnapshot.size;
      
      for (const doc of pagamentosSnapshot.docs) {
        try {
          // Verificar se evento existe, se não existir, migrar primeiro
          if (!await eventoExists(eventoId)) {
            console.log(`  📦 Evento ${eventoId} não existe no Supabase, migrando evento primeiro...`);
            const eventoMigrado = await migrateEvento(userId, eventoId, eventoDoc.data());
            if (eventoMigrado) {
              stats.eventos.inserted++;
            } else {
              console.warn(`  ⚠️  Pagamento ${doc.id}: não foi possível migrar evento ${eventoId} - pulando`);
              stats.pagamentos.errors++;
              continue;
            }
          }
          
          // Verificar se já existe
          const exists = await recordExists('pagamentos', doc.id);
          if (exists) {
            stats.pagamentos.skipped++;
            continue;
          }
          
          const data = doc.data();
          
          const supabaseData = {
            id: doc.id,
            user_id: userId,
            evento_id: eventoId,
            valor: convertNumber(data.valor),
            data_pagamento: convertTimestamp(data.dataPagamento) || new Date().toISOString(),
            forma_pagamento: data.formaPagamento || 'Dinheiro',
            status: data.status || 'Pendente',
            observacoes: data.observacoes || null,
            comprovante: data.comprovante || null,
            anexo_id: data.anexoId || null,
            cancelado: data.cancelado || false,
            data_cancelamento: convertTimestamp(data.dataCancelamento) || null,
            motivo_cancelamento: data.motivoCancelamento || null,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
            data_atualizacao: convertTimestamp(data.dataAtualizacao) || new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from('pagamentos')
            .insert(supabaseData);
          
          if (error) {
            console.error(`  ❌ Erro ao migrar pagamento ${doc.id}:`, error.message);
            stats.pagamentos.errors++;
          } else {
            stats.pagamentos.inserted++;
            if (stats.pagamentos.inserted % 50 === 0) {
              process.stdout.write(`  ✅ ${stats.pagamentos.inserted} pagamentos inseridos\r`);
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar pagamento ${doc.id}:`, error.message);
          stats.pagamentos.errors++;
        }
      }
    }
    
    console.log(`\n  ✅ Pagamentos: ${stats.pagamentos.inserted} inseridos, ${stats.pagamentos.skipped} pulados, ${stats.pagamentos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar pagamentos:', error.message);
  }
}

// Migrar Custos
async function migrateCustos(userId: string) {
  console.log('\n💰 Migrando Custos...');
  
  try {
    const eventosSnapshot = await db
      .collection('controle_users')
      .doc(userId)
      .collection('eventos')
      .get();
    
    for (const eventoDoc of eventosSnapshot.docs) {
      const eventoId = eventoDoc.id;
      const custosSnapshot = await eventoDoc.ref.collection('custos').get();
      stats.custos.total += custosSnapshot.size;
      
      for (const doc of custosSnapshot.docs) {
        try {
          // Verificar se evento existe, se não existir, migrar primeiro
          if (!await eventoExists(eventoId)) {
            console.log(`  📦 Evento ${eventoId} não existe no Supabase, migrando evento primeiro...`);
            const eventoMigrado = await migrateEvento(userId, eventoId, eventoDoc.data());
            if (eventoMigrado) {
              stats.eventos.inserted++;
            } else {
              console.warn(`  ⚠️  Custo ${doc.id}: não foi possível migrar evento ${eventoId} - pulando`);
              stats.custos.errors++;
              continue;
            }
          }
          
          // Verificar se já existe
          const exists = await recordExists('custos', doc.id);
          if (exists) {
            stats.custos.skipped++;
            continue;
          }
          
          const data = doc.data();
          
          const supabaseData = {
            id: doc.id,
            user_id: userId,
            evento_id: eventoId,
            tipo_custo_id: data.tipoCustoId || null,
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
            .insert(supabaseData);
          
          if (error) {
            console.error(`  ❌ Erro ao migrar custo ${doc.id}:`, error.message);
            stats.custos.errors++;
          } else {
            stats.custos.inserted++;
            if (stats.custos.inserted % 50 === 0) {
              process.stdout.write(`  ✅ ${stats.custos.inserted} custos inseridos\r`);
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar custo ${doc.id}:`, error.message);
          stats.custos.errors++;
        }
      }
    }
    
    console.log(`\n  ✅ Custos: ${stats.custos.inserted} inseridos, ${stats.custos.skipped} pulados, ${stats.custos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar custos:', error.message);
  }
}

// Migrar Serviços
async function migrateServicos(userId: string) {
  console.log('\n🔧 Migrando Serviços...');
  
  try {
    const eventosSnapshot = await db
      .collection('controle_users')
      .doc(userId)
      .collection('eventos')
      .get();
    
    for (const eventoDoc of eventosSnapshot.docs) {
      const eventoId = eventoDoc.id;
      const servicosSnapshot = await eventoDoc.ref.collection('servicos').get();
      stats.servicos.total += servicosSnapshot.size;
      
      for (const doc of servicosSnapshot.docs) {
        try {
          // Verificar se evento existe, se não existir, migrar primeiro
          if (!await eventoExists(eventoId)) {
            console.log(`  📦 Evento ${eventoId} não existe no Supabase, migrando evento primeiro...`);
            const eventoMigrado = await migrateEvento(userId, eventoId, eventoDoc.data());
            if (eventoMigrado) {
              stats.eventos.inserted++;
            } else {
              console.warn(`  ⚠️  Serviço ${doc.id}: não foi possível migrar evento ${eventoId} - pulando`);
              stats.servicos.errors++;
              continue;
            }
          }
          
          // Verificar se já existe
          const exists = await recordExists('servicos_evento', doc.id);
          if (exists) {
            stats.servicos.skipped++;
            continue;
          }
          
          const data = doc.data();
          
          const supabaseData = {
            id: doc.id,
            user_id: userId,
            evento_id: eventoId,
            tipo_servico_id: data.tipoServicoId || null,
            observacoes: data.observacoes || null,
            removido: data.removido || false,
            data_remocao: convertTimestamp(data.dataRemocao) || null,
            motivo_remocao: data.motivoRemocao || null,
            data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from('servicos_evento')
            .insert(supabaseData);
          
          if (error) {
            console.error(`  ❌ Erro ao migrar serviço ${doc.id}:`, error.message);
            stats.servicos.errors++;
          } else {
            stats.servicos.inserted++;
            if (stats.servicos.inserted % 50 === 0) {
              process.stdout.write(`  ✅ ${stats.servicos.inserted} serviços inseridos\r`);
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar serviço ${doc.id}:`, error.message);
          stats.servicos.errors++;
        }
      }
    }
    
    console.log(`\n  ✅ Serviços: ${stats.servicos.inserted} inseridos, ${stats.servicos.skipped} pulados, ${stats.servicos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar serviços:', error.message);
  }
}

// Migrar Anexos de Eventos
async function migrateAnexosEventos(userId: string) {
  console.log('\n📎 Migrando Anexos de Eventos...');
  
  try {
    const eventosSnapshot = await db
      .collection('controle_users')
      .doc(userId)
      .collection('eventos')
      .get();
    
    for (const eventoDoc of eventosSnapshot.docs) {
      const eventoId = eventoDoc.id;
      const anexosSnapshot = await eventoDoc.ref.collection('controle_anexos_eventos').get();
      stats.anexos_eventos.total += anexosSnapshot.size;
      
      for (const doc of anexosSnapshot.docs) {
        try {
          // Verificar se evento existe, se não existir, migrar primeiro
          if (!await eventoExists(eventoId)) {
            console.log(`  📦 Evento ${eventoId} não existe no Supabase, migrando evento primeiro...`);
            const eventoMigrado = await migrateEvento(userId, eventoId, eventoDoc.data());
            if (eventoMigrado) {
              stats.eventos.inserted++;
            } else {
              console.warn(`  ⚠️  Anexo ${doc.id}: não foi possível migrar evento ${eventoId} - pulando`);
              stats.anexos_eventos.errors++;
              continue;
            }
          }
          
          // Verificar se já existe
          const exists = await recordExists('anexos_eventos', doc.id);
          if (exists) {
            stats.anexos_eventos.skipped++;
            continue;
          }
          
          const data = doc.data();
          
          const supabaseData = {
            id: doc.id,
            evento_id: eventoId,
            nome: data.nome || '',
            tipo: normalizeTipoAnexo(data.tipo),
            url: data.url || '',
            tamanho: data.tamanho || 0,
            data_upload: convertTimestamp(data.dataUpload) || new Date().toISOString(),
          };
          
          const { error } = await supabase
            .from('anexos_eventos')
            .insert(supabaseData);
          
          if (error) {
            console.error(`  ❌ Erro ao migrar anexo ${doc.id}:`, error.message);
            stats.anexos_eventos.errors++;
          } else {
            stats.anexos_eventos.inserted++;
            if (stats.anexos_eventos.inserted % 50 === 0) {
              process.stdout.write(`  ✅ ${stats.anexos_eventos.inserted} anexos inseridos\r`);
            }
          }
        } catch (error: any) {
          console.error(`  ❌ Erro ao processar anexo ${doc.id}:`, error.message);
          stats.anexos_eventos.errors++;
        }
      }
    }
    
    console.log(`\n  ✅ Anexos: ${stats.anexos_eventos.inserted} inseridos, ${stats.anexos_eventos.skipped} pulados, ${stats.anexos_eventos.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar anexos:', error.message);
  }
}

// Migrar Canais de Entrada
async function migrateCanaisEntrada(userId: string) {
  console.log('\n📥 Migrando Canais de Entrada...');
  
  try {
    const canaisSnapshot = await db
      .collection('controle_users')
      .doc(userId)
      .collection('canais_entrada')
      .get();
    
    stats.canais_entrada.total = canaisSnapshot.size;
    
    for (const doc of canaisSnapshot.docs) {
      try {
        // Verificar se já existe
        const exists = await recordExists('canais_entrada', doc.id);
        if (exists) {
          stats.canais_entrada.skipped++;
          continue;
        }
        
        const data = doc.data();
        
        const supabaseData = {
          id: doc.id,
          user_id: userId,
          nome: data.nome || '',
          descricao: data.descricao || null,
          ativo: data.ativo !== false,
          data_cadastro: convertTimestamp(data.dataCadastro) || new Date().toISOString(),
        };
        
        const { error } = await supabase
          .from('canais_entrada')
          .insert(supabaseData);
        
        if (error) {
          console.error(`  ❌ Erro ao migrar canal ${doc.id}:`, error.message);
          stats.canais_entrada.errors++;
        } else {
          stats.canais_entrada.inserted++;
          if (stats.canais_entrada.inserted % 10 === 0) {
            process.stdout.write(`  ✅ ${stats.canais_entrada.inserted} canais inseridos\r`);
          }
        }
      } catch (error: any) {
        console.error(`  ❌ Erro ao processar canal ${doc.id}:`, error.message);
        stats.canais_entrada.errors++;
      }
    }
    
    console.log(`\n  ✅ Canais de Entrada: ${stats.canais_entrada.inserted} inseridos, ${stats.canais_entrada.skipped} pulados, ${stats.canais_entrada.errors} erros`);
  } catch (error: any) {
    console.error('  ❌ Erro ao migrar canais de entrada:', error.message);
  }
}

// Função principal
export async function migrateUserSubcollections(userId: string) {
  console.log(`🚀 Iniciando migração de subcollections para usuário: ${userId}\n`);
  console.log('⚠️  Certifique-se de que:');
  console.log('   1. O schema.sql foi executado');
  console.log('   2. As variáveis de ambiente estão configuradas');
  console.log('   3. Você tem acesso ao Firebase Admin SDK\n');
  
  const startTime = Date.now();
  
  try {
    // Limpar caches
    eventosCache.clear();
    clientesCache.clear();
    
    // Verificar se usuário existe no Firestore
    const userDoc = await db.collection('controle_users').doc(userId).get();
    if (!userDoc.exists) {
      throw new Error(`Usuário ${userId} não encontrado no Firestore`);
    }
    
    // Ordem de migração
    await migrateCanaisEntrada(userId);
    await migratePagamentos(userId);
    await migrateCustos(userId);
    await migrateServicos(userId);
    await migrateAnexosEventos(userId);
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Migração concluída!');
    console.log('='.repeat(50));
    console.log('\n📊 Estatísticas:');
    console.log(`   Clientes: ${stats.clientes.inserted} migrados (${stats.clientes.skipped} pulados, ${stats.clientes.errors} erros)`);
    console.log(`   Eventos: ${stats.eventos.inserted} migrados (${stats.eventos.skipped} pulados, ${stats.eventos.errors} erros)`);
    console.log(`   Canais de Entrada: ${stats.canais_entrada.inserted}/${stats.canais_entrada.total} inseridos (${stats.canais_entrada.skipped} pulados, ${stats.canais_entrada.errors} erros)`);
    console.log(`   Pagamentos: ${stats.pagamentos.inserted}/${stats.pagamentos.total} inseridos (${stats.pagamentos.skipped} pulados, ${stats.pagamentos.errors} erros)`);
    console.log(`   Custos: ${stats.custos.inserted}/${stats.custos.total} inseridos (${stats.custos.skipped} pulados, ${stats.custos.errors} erros)`);
    console.log(`   Serviços: ${stats.servicos.inserted}/${stats.servicos.total} inseridos (${stats.servicos.skipped} pulados, ${stats.servicos.errors} erros)`);
    console.log(`   Anexos de Eventos: ${stats.anexos_eventos.inserted}/${stats.anexos_eventos.total} inseridos (${stats.anexos_eventos.skipped} pulados, ${stats.anexos_eventos.errors} erros)`);
    console.log(`\n⏱️  Tempo total: ${duration.toFixed(2)}s\n`);
    
    return {
      success: true,
      duration,
      stats: {
        clientes: stats.clientes,
        eventos: stats.eventos,
        canais_entrada: stats.canais_entrada,
        pagamentos: stats.pagamentos,
        custos: stats.custos,
        servicos: stats.servicos,
        anexos_eventos: stats.anexos_eventos,
      }
    };
  } catch (error: any) {
    console.error('\n❌ Erro fatal na migração:', error);
    return {
      success: false,
      error: error.message,
      stats: {
        clientes: stats.clientes,
        eventos: stats.eventos,
        canais_entrada: stats.canais_entrada,
        pagamentos: stats.pagamentos,
        custos: stats.custos,
        servicos: stats.servicos,
        anexos_eventos: stats.anexos_eventos,
      }
    };
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Erro: userId é obrigatório');
    console.error('Uso: npx tsx supabase/migrate-user-subcollections.ts <userId>');
    process.exit(1);
  }
  
  migrateUserSubcollections(userId)
    .then((result) => {
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Erro:', error);
      process.exit(1);
    });
}

