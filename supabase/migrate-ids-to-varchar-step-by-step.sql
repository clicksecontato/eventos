-- ============================================
-- MIGRAÇÃO: Alterar IDs de UUID para VARCHAR(255)
-- VERSÃO STEP-BY-STEP - Execute cada bloco separadamente se houver erros
-- ============================================

-- ============================================
-- ETAPA 1: Tabelas sem dependências (podem ser alteradas primeiro)
-- ============================================

-- 1.1 Usuários (já deve estar VARCHAR, mas garantimos)
ALTER TABLE IF EXISTS users ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS users ALTER COLUMN id DROP DEFAULT;

-- 1.2 Canais de entrada (SEM dependências)
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS canais_entrada ALTER COLUMN id DROP DEFAULT;

-- 1.3 Tipos de eventos (SEM dependências)
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_eventos ALTER COLUMN id DROP DEFAULT;

-- 1.4 Tipos de custos (SEM dependências)
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_custos ALTER COLUMN id DROP DEFAULT;

-- 1.5 Tipos de serviços (SEM dependências)
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS tipo_servicos ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- ETAPA 2: Foreign keys que dependem das tabelas da ETAPA 1
-- ============================================

-- 2.1 Clientes - foreign key para canais_entrada (AGORA pode ser alterado)
ALTER TABLE IF EXISTS clientes ALTER COLUMN canal_entrada_id TYPE VARCHAR(255);

-- ============================================
-- ETAPA 3: Tabela clientes (agora que canais_entrada está OK)
-- ============================================

-- 3.1 Clientes - id principal
ALTER TABLE IF EXISTS clientes ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS clientes ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- ETAPA 4: Foreign keys que dependem de clientes
-- ============================================

-- 4.1 Eventos - foreign key para clientes (AGORA pode ser alterado)
ALTER TABLE IF EXISTS eventos ALTER COLUMN cliente_id TYPE VARCHAR(255);

-- 4.2 Eventos - foreign key para tipo_eventos (já alterado na ETAPA 1)
ALTER TABLE IF EXISTS eventos ALTER COLUMN tipo_evento_id TYPE VARCHAR(255);

-- ============================================
-- ETAPA 5: Tabela eventos
-- ============================================

-- 5.1 Eventos - id principal
ALTER TABLE IF EXISTS eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS eventos ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- ETAPA 6: Foreign keys que dependem de eventos
-- ============================================

-- 6.1 Pagamentos - foreign key para eventos
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN evento_id TYPE VARCHAR(255);

-- 6.2 Custos - foreign keys
ALTER TABLE IF EXISTS custos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN tipo_custo_id TYPE VARCHAR(255);

-- 6.3 Serviços - foreign keys
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN tipo_servico_id TYPE VARCHAR(255);

-- 6.4 Anexos - foreign keys
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN evento_id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN evento_id TYPE VARCHAR(255);

-- 6.5 Contratos - foreign key para eventos
ALTER TABLE IF EXISTS contratos ALTER COLUMN evento_id TYPE VARCHAR(255);

-- ============================================
-- ETAPA 7: Tabelas que dependem de eventos
-- ============================================

-- 7.1 Pagamentos
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS pagamentos ALTER COLUMN anexo_id TYPE VARCHAR(255);

-- 7.2 Custos
ALTER TABLE IF EXISTS custos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS custos ALTER COLUMN id DROP DEFAULT;

-- 7.3 Serviços
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS servicos_evento ALTER COLUMN id DROP DEFAULT;

-- 7.4 Anexos de eventos
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_eventos ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- ETAPA 8: Foreign keys que dependem de pagamentos
-- ============================================

-- 8.1 Anexos de pagamento - foreign key para pagamentos
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN pagamento_id TYPE VARCHAR(255);

-- ============================================
-- ETAPA 9: Anexos de pagamento
-- ============================================

-- 9.1 Anexos de pagamento - id principal
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS anexos_pagamento ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- ETAPA 10: Outras tabelas
-- ============================================

-- 10.1 Modelos de contrato
ALTER TABLE IF EXISTS modelos_contrato ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS modelos_contrato ALTER COLUMN id DROP DEFAULT;

-- 10.2 Foreign key de contratos para modelos_contrato
ALTER TABLE IF EXISTS contratos ALTER COLUMN modelo_contrato_id TYPE VARCHAR(255);

-- 10.3 Configuração de contrato
ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS configuracao_contrato ALTER COLUMN id DROP DEFAULT;

-- 10.4 Contratos
ALTER TABLE IF EXISTS contratos ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS contratos ALTER COLUMN id DROP DEFAULT;

-- 10.5 Relatórios
ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_diarios ALTER COLUMN id DROP DEFAULT;

ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS relatorios_cache ALTER COLUMN id DROP DEFAULT;

-- 10.6 Google Calendar Tokens
ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN id TYPE VARCHAR(255);
ALTER TABLE IF EXISTS google_calendar_tokens ALTER COLUMN id DROP DEFAULT;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se ainda há colunas UUID que deveriam ser VARCHAR
SELECT 
    table_name, 
    column_name, 
    data_type 
FROM information_schema.columns 
WHERE column_name IN ('id', 'cliente_id', 'evento_id', 'tipo_evento_id', 'tipo_custo_id', 'tipo_servico_id', 'canal_entrada_id', 'pagamento_id', 'modelo_contrato_id', 'anexo_id')
    AND table_schema = 'public'
    AND data_type = 'uuid'  -- Mostrar apenas os que ainda são UUID (erro se houver)
ORDER BY table_name, column_name;














