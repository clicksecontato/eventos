import { db } from '../firebase';
import { COLLECTIONS } from './collections';
import { 
  clientes, 
  eventos, 
  pagamentos, 
  tiposCusto, 
  custosEvento, 
  anexosEvento 
} from '../mockData';

export async function initializeCollections() {
  console.log('🚀 Iniciando inicialização das collections do Firestore...');
  
  try {
    // Verificar se as collections já existem
    const collections = [
      COLLECTIONS.CLIENTES,
      COLLECTIONS.EVENTOS,
      COLLECTIONS.PAGAMENTOS,
      COLLECTIONS.TIPO_CUSTOS,
      COLLECTIONS.CUSTOS,
      COLLECTIONS.ANEXOS_EVENTOS
    ];

    for (const collectionName of collections) {
      console.log(`📁 Verificando collection: ${collectionName}`);
      // As collections são criadas automaticamente quando o primeiro documento é adicionado
    }

    console.log('✅ Inicialização das collections concluída!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao inicializar collections:', error);
    return false;
  }
}

export async function seedInitialData() {
  console.log('🌱 Seed desabilitado - agora usa subcollections');
  console.log('📊 Use a página de migração em /admin/migration para migrar dados');
  return true;
}

export async function resetCollections() {
  console.log('🔄 Reset desabilitado - agora usa subcollections');
  console.log('📊 Use a página de migração em /admin/migration para gerenciar dados');
  return true;
}
