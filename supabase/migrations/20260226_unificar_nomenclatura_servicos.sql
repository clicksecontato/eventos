-- ============================================================
-- Unificação de nomenclatura: tipo_servicos -> servicos
-- Estratégia de transição sem quebra:
-- 1) tabela canônica passa a ser "servicos"
-- 2) view legada "tipo_servicos" é mantida para compatibilidade
-- 3) vínculos recebem "servico_id" sem remover "tipo_servico_id"
-- 4) trigger sincroniza ambas as colunas durante a transição
-- ============================================================

BEGIN;

-- 1) Renomear tabela de catálogo para nome canônico
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'tipo_servicos'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'servicos'
  ) THEN
    EXECUTE 'ALTER TABLE tipo_servicos RENAME TO servicos';
  END IF;
END $$;

-- 2) Ajustar nome do índice principal (quando existir)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_tipo_servicos_user_id'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER INDEX idx_tipo_servicos_user_id RENAME TO idx_servicos_user_id';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_tipo_servicos_ativo'
      AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER INDEX idx_tipo_servicos_ativo RENAME TO idx_servicos_ativo';
  END IF;
END $$;

-- 3) Manter compatibilidade: recriar view tipo_servicos apontando para servicos
DROP VIEW IF EXISTS tipo_servicos;
CREATE VIEW tipo_servicos AS
SELECT * FROM servicos;

-- 4) Adicionar coluna canônica servico_id em servicos_evento
ALTER TABLE servicos_evento
  ADD COLUMN IF NOT EXISTS servico_id VARCHAR(255);

UPDATE servicos_evento
SET servico_id = tipo_servico_id
WHERE servico_id IS NULL;

ALTER TABLE servicos_evento
  ALTER COLUMN servico_id SET NOT NULL;

-- FK canônica
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'servicos_evento'
      AND constraint_name = 'servicos_evento_servico_id_fkey'
  ) THEN
    EXECUTE '
      ALTER TABLE servicos_evento
      ADD CONSTRAINT servicos_evento_servico_id_fkey
      FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_servicos_evento_servico_id ON servicos_evento(servico_id);

-- 5) Adicionar coluna canônica servico_id em pre_cadastros_servicos
ALTER TABLE pre_cadastros_servicos
  ADD COLUMN IF NOT EXISTS servico_id VARCHAR(255);

UPDATE pre_cadastros_servicos
SET servico_id = tipo_servico_id
WHERE servico_id IS NULL;

ALTER TABLE pre_cadastros_servicos
  ALTER COLUMN servico_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'pre_cadastros_servicos'
      AND constraint_name = 'pre_cadastros_servicos_servico_id_fkey'
  ) THEN
    EXECUTE '
      ALTER TABLE pre_cadastros_servicos
      ADD CONSTRAINT pre_cadastros_servicos_servico_id_fkey
      FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT
    ';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pre_cadastros_servicos_servico_id ON pre_cadastros_servicos(servico_id);

-- 6) Trigger para manter sincronia entre legado (tipo_servico_id) e canônico (servico_id)
CREATE OR REPLACE FUNCTION sync_servico_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.servico_id IS NULL AND NEW.tipo_servico_id IS NOT NULL THEN
    NEW.servico_id := NEW.tipo_servico_id;
  ELSIF NEW.tipo_servico_id IS NULL AND NEW.servico_id IS NOT NULL THEN
    NEW.tipo_servico_id := NEW.servico_id;
  END IF;

  IF NEW.servico_id IS DISTINCT FROM NEW.tipo_servico_id THEN
    NEW.tipo_servico_id := NEW.servico_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_servico_ids_servicos_evento ON servicos_evento;
CREATE TRIGGER trg_sync_servico_ids_servicos_evento
BEFORE INSERT OR UPDATE ON servicos_evento
FOR EACH ROW
EXECUTE FUNCTION sync_servico_ids();

DROP TRIGGER IF EXISTS trg_sync_servico_ids_pre_cadastros_servicos ON pre_cadastros_servicos;
CREATE TRIGGER trg_sync_servico_ids_pre_cadastros_servicos
BEFORE INSERT OR UPDATE ON pre_cadastros_servicos
FOR EACH ROW
EXECUTE FUNCTION sync_servico_ids();

COMMIT;
