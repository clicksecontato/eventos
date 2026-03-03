export type ProvedorDados = 'supabase';

const provedorNormalizado = (process.env.DATA_PROVIDER || 'supabase').toLowerCase();

export function getProvedorDadosAtual(): ProvedorDados {
  if (provedorNormalizado !== 'supabase') {
    throw new Error(
      `DATA_PROVIDER inválido: "${process.env.DATA_PROVIDER}". Atualmente apenas "supabase" é suportado.`
    );
  }

  return 'supabase';
}

