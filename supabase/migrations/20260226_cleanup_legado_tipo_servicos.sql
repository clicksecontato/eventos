-- ============================================================
-- Cleanup legado: tipo_servicos / tipo_servico_id
-- Executar em janela controlada após validação completa
-- Pré-requisito: app já operando apenas com servico_id
-- ============================================================

BEGIN;

-- 1) Remover triggers/função de sincronização legada (se existirem)
DROP TRIGGER IF EXISTS trg_sync_servico_ids_servicos_evento ON servicos_evento;
DROP TRIGGER IF EXISTS trg_sync_servico_ids_pre_cadastros_servicos ON pre_cadastros_servicos;
DROP FUNCTION IF EXISTS sync_servico_ids();

-- 2) Remover colunas legadas
ALTER TABLE IF EXISTS servicos_evento
  DROP COLUMN IF EXISTS tipo_servico_id;

ALTER TABLE IF EXISTS pre_cadastros_servicos
  DROP COLUMN IF EXISTS tipo_servico_id;

-- 3) Remover view legada (se houver)
DROP VIEW IF EXISTS tipo_servicos;

COMMIT;
