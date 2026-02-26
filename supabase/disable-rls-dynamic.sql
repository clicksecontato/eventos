-- ============================================
-- DESABILITAR RLS DINAMICAMENTE EM TODAS AS TABELAS
-- ============================================
-- Este script desabilita RLS em todas as tabelas do schema public automaticamente
-- Use este script se o RLS foi habilitado por engano e você precisa desabilitá-lo em todas as tabelas

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', r.tablename);
            RAISE NOTICE '✅ RLS desabilitado na tabela: %', r.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '⚠️ Erro ao desabilitar RLS na tabela %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END $$;













