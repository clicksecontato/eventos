-- ============================================
-- DESABILITAR RLS EM TODAS AS TABELAS
-- ============================================
-- Execute este script no SQL Editor do Supabase para desabilitar RLS em todas as tabelas
-- ⚠️ ATENÇÃO: Isso remove a segurança RLS. Use apenas para desenvolvimento!

-- Método 1: Desabilitar RLS tabela por tabela (mais seguro e explícito)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE canais_entrada DISABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_custos DISABLE ROW LEVEL SECURITY;
ALTER TABLE tipo_servicos DISABLE ROW LEVEL SECURITY;
ALTER TABLE clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE pagamentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE anexos_pagamento DISABLE ROW LEVEL SECURITY;
ALTER TABLE custos DISABLE ROW LEVEL SECURITY;
ALTER TABLE servicos_evento DISABLE ROW LEVEL SECURITY;
ALTER TABLE anexos_eventos DISABLE ROW LEVEL SECURITY;
ALTER TABLE modelos_contrato DISABLE ROW LEVEL SECURITY;
ALTER TABLE configuracao_contrato DISABLE ROW LEVEL SECURITY;
ALTER TABLE contratos DISABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_diarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE relatorios_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE google_calendar_tokens DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Método 2: Desabilitar RLS dinamicamente (automático)
-- ============================================
-- Este método busca todas as tabelas do schema public e desabilita RLS automaticamente
-- Descomente o bloco abaixo para usar:

/*
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
            RAISE NOTICE 'RLS desabilitado na tabela: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao desabilitar RLS na tabela %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;
*/

