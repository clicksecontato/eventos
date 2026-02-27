-- ============================================
-- MIGRAÇÃO SINGLE-TENANT: EMPRESA_ID
-- Data: 2026-02-26
-- Objetivo:
-- 1) Adicionar empresa_id nas tabelas de domínio
-- 2) Backfill com valor único default
-- 3) Indexar empresa_id para consultas corporativas
-- 4) Manter user_id como auditoria de autoria
-- ============================================

BEGIN;

-- Valor padrão para tenant único
-- Observação: manter consistente com src/lib/tenant-config.ts
DO $$
DECLARE
  tenant_id CONSTANT text := 'default';
BEGIN
  -- USERS
  ALTER TABLE users ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE users SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE users ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE users ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_users_empresa_id ON users(empresa_id);

  -- CONFIGURAÇÃO
  ALTER TABLE canais_entrada ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE canais_entrada SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE canais_entrada ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE canais_entrada ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_canais_entrada_empresa_id ON canais_entrada(empresa_id);

  ALTER TABLE tipo_eventos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE tipo_eventos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE tipo_eventos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE tipo_eventos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_tipo_eventos_empresa_id ON tipo_eventos(empresa_id);

  ALTER TABLE tipo_custos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE tipo_custos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE tipo_custos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE tipo_custos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_tipo_custos_empresa_id ON tipo_custos(empresa_id);

  ALTER TABLE tipo_servicos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE tipo_servicos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE tipo_servicos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE tipo_servicos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_tipo_servicos_empresa_id ON tipo_servicos(empresa_id);

  -- DOMÍNIO
  ALTER TABLE clientes ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE clientes SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE clientes ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE clientes ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_clientes_empresa_id ON clientes(empresa_id);

  ALTER TABLE eventos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE eventos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE eventos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE eventos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_eventos_empresa_id ON eventos(empresa_id);

  ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE pagamentos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE pagamentos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE pagamentos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_pagamentos_empresa_id ON pagamentos(empresa_id);

  ALTER TABLE anexos_pagamento ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE anexos_pagamento SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE anexos_pagamento ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE anexos_pagamento ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_anexos_pagamento_empresa_id ON anexos_pagamento(empresa_id);

  ALTER TABLE custos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE custos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE custos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE custos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_custos_empresa_id ON custos(empresa_id);

  ALTER TABLE anexos_custo ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE anexos_custo SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE anexos_custo ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE anexos_custo ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_anexos_custo_empresa_id ON anexos_custo(empresa_id);

  ALTER TABLE servicos_evento ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE servicos_evento SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE servicos_evento ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE servicos_evento ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_servicos_evento_empresa_id ON servicos_evento(empresa_id);

  ALTER TABLE pre_cadastros_eventos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE pre_cadastros_eventos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE pre_cadastros_eventos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE pre_cadastros_eventos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_pre_cadastros_eventos_empresa_id ON pre_cadastros_eventos(empresa_id);

  ALTER TABLE pre_cadastros_servicos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE pre_cadastros_servicos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE pre_cadastros_servicos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE pre_cadastros_servicos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_pre_cadastros_servicos_empresa_id ON pre_cadastros_servicos(empresa_id);

  ALTER TABLE anexos_eventos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE anexos_eventos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE anexos_eventos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE anexos_eventos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_anexos_eventos_empresa_id ON anexos_eventos(empresa_id);

  -- CONTRATOS
  ALTER TABLE modelos_contrato ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE modelos_contrato SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE modelos_contrato ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE modelos_contrato ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_modelos_contrato_empresa_id ON modelos_contrato(empresa_id);

  ALTER TABLE variaveis_contrato ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE variaveis_contrato SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE variaveis_contrato ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE variaveis_contrato ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_variaveis_contrato_empresa_id ON variaveis_contrato(empresa_id);

  ALTER TABLE configuracao_contrato ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE configuracao_contrato SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE configuracao_contrato ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE configuracao_contrato ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_configuracao_contrato_empresa_id ON configuracao_contrato(empresa_id);

  ALTER TABLE contratos ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE contratos SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE contratos ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE contratos ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_contratos_empresa_id ON contratos(empresa_id);

  -- RELATÓRIOS/CACHE
  ALTER TABLE relatorios_diarios ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE relatorios_diarios SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE relatorios_diarios ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE relatorios_diarios ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_relatorios_diarios_empresa_id ON relatorios_diarios(empresa_id);

  ALTER TABLE relatorios_cache ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE relatorios_cache SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE relatorios_cache ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE relatorios_cache ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_relatorios_cache_empresa_id ON relatorios_cache(empresa_id);

  -- INTEGRAÇÕES
  ALTER TABLE google_calendar_tokens ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(100);
  UPDATE google_calendar_tokens SET empresa_id = tenant_id WHERE empresa_id IS NULL;
  ALTER TABLE google_calendar_tokens ALTER COLUMN empresa_id SET NOT NULL;
  ALTER TABLE google_calendar_tokens ALTER COLUMN empresa_id SET DEFAULT 'default';
  CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_empresa_id ON google_calendar_tokens(empresa_id);
END $$;

COMMIT;

-- ============================================
-- NOTA
-- Nesta etapa, user_id continua disponível para auditoria/autoria.
-- A refatoração de filtros em services/repositories para empresa_id
-- deve ser aplicada em etapa posterior (backend/camada de dados).
-- ============================================

