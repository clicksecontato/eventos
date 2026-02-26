// Tipos gerados automaticamente pelo Supabase
// Execute: npx supabase gen types typescript --project-id seu-projeto-id > src/lib/supabase/types.ts
// Ou use o Supabase CLI para gerar automaticamente

// Por enquanto, definimos manualmente baseado no schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nome: string;
          role: 'admin' | 'user';
          ativo: boolean;
          assinatura: Json | null;
          data_cadastro: string;
          data_atualizacao: string;
        };
        Insert: {
          id?: string;
          email: string;
          nome: string;
          role?: 'admin' | 'user';
          ativo?: boolean;
          assinatura?: Json | null;
          data_cadastro?: string;
          data_atualizacao?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nome?: string;
          role?: 'admin' | 'user';
          ativo?: boolean;
          assinatura?: Json | null;
          data_cadastro?: string;
          data_atualizacao?: string;
        };
      };
      clientes: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          cpf: string | null;
          email: string | null;
          telefone: string | null;
          endereco: string | null;
          cep: string | null;
          instagram: string | null;
          canal_entrada_id: string | null;
          arquivado: boolean;
          data_arquivamento: string | null;
          motivo_arquivamento: string | null;
          data_cadastro: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          cpf?: string | null;
          email?: string | null;
          telefone?: string | null;
          endereco?: string | null;
          cep?: string | null;
          instagram?: string | null;
          canal_entrada_id?: string | null;
          arquivado?: boolean;
          data_arquivamento?: string | null;
          motivo_arquivamento?: string | null;
          data_cadastro?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          cpf?: string | null;
          email?: string | null;
          telefone?: string | null;
          endereco?: string | null;
          cep?: string | null;
          instagram?: string | null;
          canal_entrada_id?: string | null;
          arquivado?: boolean;
          data_arquivamento?: string | null;
          motivo_arquivamento?: string | null;
          data_cadastro?: string;
        };
      };
      eventos: {
        Row: {
          id: string;
          user_id: string;
          cliente_id: string;
          nome_evento: string | null;
          data_evento: string;
          dia_semana: string | null;
          local: string;
          endereco: string | null;
          tipo_evento: string;
          tipo_evento_id: string | null;
          saida: string | null;
          chegada_no_local: string | null;
          horario_inicio: string | null;
          horario_desmontagem: string | null;
          tempo_evento: string | null;
          contratante: string | null;
          numero_convidados: number;
          quantidade_mesas: number | null;
          hashtag: string | null;
          numero_impressoes: number | null;
          cerimonialista: Json | null;
          observacoes: string | null;
          status: 'Agendado' | 'Confirmado' | 'Em andamento' | 'Concluído' | 'Cancelado';
          valor_total: number;
          dia_final_pagamento: string | null;
          arquivado: boolean;
          data_arquivamento: string | null;
          motivo_arquivamento: string | null;
          google_calendar_event_id: string | null;
          google_calendar_synced_at: string | null;
          data_cadastro: string;
          data_atualizacao: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cliente_id: string;
          nome_evento?: string | null;
          data_evento: string;
          dia_semana?: string | null;
          local: string;
          endereco?: string | null;
          tipo_evento: string;
          tipo_evento_id?: string | null;
          saida?: string | null;
          chegada_no_local?: string | null;
          horario_inicio?: string | null;
          horario_desmontagem?: string | null;
          tempo_evento?: string | null;
          contratante?: string | null;
          numero_convidados?: number;
          quantidade_mesas?: number | null;
          hashtag?: string | null;
          numero_impressoes?: number | null;
          cerimonialista?: Json | null;
          observacoes?: string | null;
          status?: 'Agendado' | 'Confirmado' | 'Em andamento' | 'Concluído' | 'Cancelado';
          valor_total?: number;
          dia_final_pagamento?: string | null;
          arquivado?: boolean;
          data_arquivamento?: string | null;
          motivo_arquivamento?: string | null;
          google_calendar_event_id?: string | null;
          google_calendar_synced_at?: string | null;
          data_cadastro?: string;
          data_atualizacao?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          cliente_id?: string;
          nome_evento?: string | null;
          data_evento?: string;
          dia_semana?: string | null;
          local?: string;
          endereco?: string | null;
          tipo_evento?: string;
          tipo_evento_id?: string | null;
          saida?: string | null;
          chegada_no_local?: string | null;
          horario_inicio?: string | null;
          horario_desmontagem?: string | null;
          tempo_evento?: string | null;
          contratante?: string | null;
          numero_convidados?: number;
          quantidade_mesas?: number | null;
          hashtag?: string | null;
          numero_impressoes?: number | null;
          cerimonialista?: Json | null;
          observacoes?: string | null;
          status?: 'Agendado' | 'Confirmado' | 'Em andamento' | 'Concluído' | 'Cancelado';
          valor_total?: number;
          dia_final_pagamento?: string | null;
          arquivado?: boolean;
          data_arquivamento?: string | null;
          motivo_arquivamento?: string | null;
          google_calendar_event_id?: string | null;
          google_calendar_synced_at?: string | null;
          data_cadastro?: string;
          data_atualizacao?: string;
        };
      };
      // Adicione outros tipos conforme necessário
      [key: string]: any;
    };
    Views: {
      [key: string]: never;
    };
    Functions: {
      [key: string]: never;
    };
    Enums: {
      [key: string]: never;
    };
  };
}

