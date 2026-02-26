import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Sincroniza um usuário do Firebase Auth para o Supabase
 * Cria ou atualiza o usuário na tabela users do Supabase
 */
export async function syncFirebaseUserToSupabase(
  firebaseUid: string,
  email: string,
  nome: string,
  role: 'admin' | 'user' = 'user'
): Promise<string | null> {
  // Se Supabase não estiver configurado, retornar o Firebase UID
  if (!isSupabaseConfigured()) {
    return firebaseUid;
  }

  try {
    const supabase = getSupabaseClient();

    // Verificar se o usuário já existe no Supabase
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('id', firebaseUid)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Erro ao buscar usuário no Supabase:', fetchError);
      return firebaseUid; // Fallback para Firebase UID
    }

    if (existingUser) {
      // Usuário já existe, atualizar dados se necessário
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email,
          nome,
          role,
          data_atualizacao: new Date().toISOString()
        })
        .eq('id', firebaseUid);

      if (updateError) {
        console.error('Erro ao atualizar usuário no Supabase:', updateError);
      }

      return firebaseUid;
    } else {
      // Criar novo usuário no Supabase usando o Firebase UID como ID
      // IMPORTANTE: Precisamos modificar o schema para aceitar string ao invés de UUID
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: firebaseUid, // Usar Firebase UID como ID
          email,
          nome,
          role,
          ativo: true,
          data_cadastro: new Date().toISOString(),
          data_atualizacao: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Erro ao criar usuário no Supabase:', insertError);
        // Se falhar por causa do tipo UUID, tentar criar com UUID gerado
        // e criar uma tabela de mapeamento depois
        return firebaseUid; // Fallback
      }

      // Type assertion para resolver problema de inferência de tipos do Supabase
      const userData = newUser as any;
      return userData?.id || firebaseUid;
    }
  } catch (error) {
    console.error('Erro ao sincronizar usuário Firebase -> Supabase:', error);
    return firebaseUid; // Fallback para Firebase UID
  }
}

