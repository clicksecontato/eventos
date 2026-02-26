// Interface para compatibilidade com repositórios Firebase (se necessário no futuro)
import { VariavelContratoSupabaseRepository } from './supabase/variavel-contrato-supabase-repository';

// Por enquanto, apenas exportar o repositório Supabase
// Se no futuro precisar de suporte Firebase, criar VariavelContratoFirestoreRepository
export type VariavelContratoRepository = VariavelContratoSupabaseRepository;
