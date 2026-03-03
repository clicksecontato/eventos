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

-- 2) Consolidar dados no canônico (servico_id) antes da remoção do legado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'servicos_evento'
      AND column_name = 'tipo_servico_id'
  ) THEN
    UPDATE servicos_evento
    SET servico_id = tipo_servico_id
    WHERE servico_id IS NULL
      AND tipo_servico_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pre_cadastros_servicos'
      AND column_name = 'tipo_servico_id'
  ) THEN
    UPDATE pre_cadastros_servicos
    SET servico_id = tipo_servico_id
    WHERE servico_id IS NULL
      AND tipo_servico_id IS NOT NULL;
  END IF;
END $$;

-- Falha explicitamente se ainda houver linhas sem servico_id
DO $$
DECLARE
  total_sem_servico_evento BIGINT;
  total_sem_servico_precadastro BIGINT;
BEGIN
  SELECT COUNT(*) INTO total_sem_servico_evento
  FROM servicos_evento
  WHERE servico_id IS NULL;

  SELECT COUNT(*) INTO total_sem_servico_precadastro
  FROM pre_cadastros_servicos
  WHERE servico_id IS NULL;

  IF total_sem_servico_evento > 0 OR total_sem_servico_precadastro > 0 THEN
    RAISE EXCEPTION 'Existem registros sem servico_id (servicos_evento: %, pre_cadastros_servicos: %). Corrija antes do cleanup.',
      total_sem_servico_evento, total_sem_servico_precadastro;
  END IF;
END $$;

-- 3) Remover colunas legadas
ALTER TABLE IF EXISTS servicos_evento
  DROP COLUMN IF EXISTS tipo_servico_id;

ALTER TABLE IF EXISTS pre_cadastros_servicos
  DROP COLUMN IF EXISTS tipo_servico_id;

-- 4) Remover view legada (se houver)
DROP VIEW IF EXISTS tipo_servicos;

COMMIT;
