/**
 * Utilitário para verificar qual banco de dados está sendo usado
 */
export function checkDatabaseConfig() {
  const useSupabase = process.env.USE_SUPABASE === 'true';
  const hasSupabaseConfig = !!process.env.NEXT_PUBLIC_SUPABASE_URL && 
                           !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  return {
    usingSupabase: useSupabase && hasSupabaseConfig,
    useSupabaseFlag: useSupabase,
    hasSupabaseConfig,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado',
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado',
  };
}

/**
 * Loga a configuração atual do banco de dados
 */
export function logDatabaseConfig() {
  const config = checkDatabaseConfig();
  console.log('📊 Configuração do Banco de Dados:', config);
  return config;
}

