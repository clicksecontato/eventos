-- ============================================
-- MIGRAÇÃO: Alterar IDs de UUID para VARCHAR(255)
-- Para compatibilidade com IDs do Firestore
-- ============================================

-- IMPORTANTE: Execute este script se você já criou as tabelas com UUID
-- Isso permite usar os IDs originais do Firestore

BEGIN;

-- IMPORTANTE: Ordem das alterações é crítica!
-- Primeiro alteramos as tabelas principais, depois as foreign keys

-- 1. Alterar tabela clientes (PRIMEIRO - tabela referenciada)
ALTER TABLE IF EXISTS clientes ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS clientes ALTER COLUMN id DROP DEFAULT;

-- 2. Alterar tabela eventos (id PRIMEIRO, depois foreign keys)
ALTER TABLE IF EXISTS eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS eventos ALTER COLUMN id DROP DEFAULT;

-- 3. Agora podemos alterar foreign key cliente_id em eventos
ALTER TABLE IF EXISTS eventos ALTER COLUMN cliente_id TYPE VARCHAR(255);

-- 4. Alterar foreign key evento_id em outras tabelas
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS contratos ALTER COLUMN evento_id TYPE VARCHAR(255);

-- 5. Alterar outras tabelas que usam UUID como ID (PRIMEIRO as tabelas, depois foreign keys)
-- Canais de entrada
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS clientes ALTER COLUMN canal_entrada_id TYPE VARCHAR(255);

-- Tipos de eventos
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS eventos ALTER COLUMN tipo_evento_id TYPE VARCHAR(255);

-- Tipos de custos
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS custos ALTER COLUMN tipo_custo_id TYPE VARCHAR(255);

-- Tipos de serviços
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN tipo_servico_id TYPE VARCHAR(255);

-- 6. Alterar pagamentos, custos e servicos (PRIMEIRO as tabelas, depois foreign keys)
-- Pagamentos
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN pagamento_id TYPE VARCHAR(255);

-- Custos
ALTER TABLE IF EXISTS custos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN id DROP DEFAULT;

-- Serviços
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN id DROP DEFAULT;

-- 7. Alterar outras tabelas relacionadas
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS modelos_contrato ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS modelos_contrato ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS contratos ALTER COLUMN modelo_contrato_id TYPE VARCHAR(255);

ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS contratos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS contratos ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN id DROP DEFAULT;

COMMIT;

-- Verificar se a migração foi bem-sucedida
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name IN ('id', 'cliente_id', 'evento_id', 'tipo_evento_id', 'tipo_custo_id', 'tipo_servico_id', 'canal_entrada_id')
    AND table_schema = 'public'
ORDER BY table_name, column_name;

