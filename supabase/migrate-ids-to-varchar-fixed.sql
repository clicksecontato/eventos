-- ============================================
-- MIGRAÇÃO: Alterar IDs de UUID para VARCHAR(255)
-- Para compatibilidade com IDs do Firestore
-- VERSÃO CORRIGIDA - Ordem correta das alterações
-- ============================================

-- IMPORTANTE: Execute este script se você já criou as tabelas com UUID
-- A ordem das alterações é crítica para evitar erros de foreign key

BEGIN;

-- ============================================
-- ETAPA 1: Alterar tabelas principais (sem dependências)
-- ============================================

-- Usuários (já deve estar VARCHAR(255), mas garantimos)
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS users ALTER COLUMN id DROP DEFAULT;

-- Canais de entrada
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN id DROP DEFAULT;

-- Tipos de eventos
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN id DROP DEFAULT;

-- Tipos de custos
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN id DROP DEFAULT;

-- Tipos de serviços
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- ETAPA 2: Alterar tabelas que dependem das anteriores
-- ============================================

-- Clientes (depende de users e canais_entrada)
-- IMPORTANTE: Alterar canal_entrada_id DEPOIS que canais_entrada.id já foi alterado
ALTER TABLE IF EXISTS clientes ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS clientes ALTER COLUMN id DROP DEFAULT;
-- Esta linha deve vir DEPOIS que canais_entrada.id já foi alterado (linha acima)
-- Mas como já alteramos canais_entrada na ETAPA 1, está OK aqui
ALTER TABLE IF EXISTS clientes ALTER COLUMN canal_entrada_id TYPE VARCHAR(255);

-- Eventos (depende de users, clientes e tipo_eventos)
ALTER TABLE IF EXISTS eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS eventos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS eventos ALTER COLUMN cliente_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS eventos ALTER COLUMN tipo_evento_id TYPE VARCHAR(255);

-- ============================================
-- ETAPA 3: Alterar tabelas que dependem de eventos
-- ============================================

-- Pagamentos (depende de users e eventos)
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN evento_id TYPE VARCHAR(255);

-- Custos (depende de users, eventos e tipo_custos)
ALTER TABLE IF EXISTS custos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS custos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN tipo_custo_id TYPE VARCHAR(255);

-- Serviços (depende de users, eventos e tipo_servicos)
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN tipo_servico_id TYPE VARCHAR(255);

-- Anexos de eventos (depende de eventos)
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN evento_id TYPE VARCHAR(255);

-- Anexos de pagamento (depende de users, eventos e pagamentos)
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN pagamento_id TYPE VARCHAR(255);

-- Pagamentos - anexo_id
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN anexo_id TYPE VARCHAR(255);

-- ============================================
-- ETAPA 4: Outras tabelas
-- ============================================

-- Modelos de contrato
ALTER TABLE IF EXISTS modelos_contrato ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS modelos_contrato ALTER COLUMN id DROP DEFAULT;

-- Configuração de contrato
ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN id DROP DEFAULT;

-- Contratos (depende de users, eventos e modelos_contrato)
ALTER TABLE IF EXISTS contratos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS contratos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS contratos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS contratos ALTER COLUMN modelo_contrato_id TYPE VARCHAR(255);

-- Relatórios
ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN id DROP DEFAULT;

-- Google Calendar Tokens
ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN id DROP DEFAULT;

COMMIT;

-- Verificar se a migração foi bem-sucedida
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name IN ('id', 'cliente_id', 'evento_id', 'tipo_evento_id', 'tipo_custo_id', 'tipo_servico_id', 'canal_entrada_id', 'pagamento_id', 'modelo_contrato_id')
    AND table_schema = 'public'
    AND data_type = 'uuid'  -- Mostrar apenas os que ainda são UUID (erro se houver)
ORDER BY table_name, column_name;

