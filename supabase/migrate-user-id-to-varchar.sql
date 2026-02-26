-- ============================================
-- MIGRAÇÃO: Alterar user_id de UUID para VARCHAR(255)
-- Para compatibilidade com Firebase Auth UIDs
-- ============================================

-- IMPORTANTE: Execute este script se você já criou as tabelas com UUID
-- Se você ainda não criou as tabelas, apenas execute o schema.sql atualizado

BEGIN;

-- 1. Alterar tabela users
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS users ALTER COLUMN id DROP DEFAULT;

-- 2. Alterar todas as foreign keys user_id
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS clientes ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS eventos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS contratos ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN user_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN user_id TYPE VARCHAR(255);

-- 3. Verificar se há outras colunas que referenciam users
-- (contratos.criado_por também precisa ser atualizado se existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contratos' 
        AND column_name = 'criado_por' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE contratos ALTER COLUMN criado_por TYPE VARCHAR(255);
    END IF;
END $$;

COMMIT;

-- Verificar se a migração foi bem-sucedida
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name = 'user_id' 
    AND table_schema = 'public'
ORDER BY table_name;

