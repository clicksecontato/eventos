-- ============================================
-- MIGRACAO: Precificacao por tipo e por item de servico
-- Data: 2026-02-26
-- ============================================

-- 1) Tipo de servico: valor padrao
ALTER TABLE tipo_servicos
ADD COLUMN IF NOT EXISTS valor_padrao DECIMAL(10, 2) NOT NULL DEFAULT 0;

-- 2) Servicos por evento: quantidade e snapshot de precificacao
ALTER TABLE servicos_evento
ADD COLUMN IF NOT EXISTS quantidade INTEGER NOT NULL DEFAULT 1;

ALTER TABLE servicos_evento
ADD COLUMN IF NOT EXISTS valor_unitario DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE servicos_evento
ADD COLUMN IF NOT EXISTS valor_total_item DECIMAL(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE servicos_evento
ADD COLUMN IF NOT EXISTS origem_preco VARCHAR(20) NOT NULL DEFAULT 'padrao'
CHECK (origem_preco IN ('padrao', 'editado_manual'));

ALTER TABLE servicos_evento
ADD COLUMN IF NOT EXISTS motivo_ajuste TEXT;

UPDATE servicos_evento
SET valor_total_item = COALESCE(quantidade, 1) * COALESCE(valor_unitario, 0)
WHERE valor_total_item IS NULL OR valor_total_item = 0;

-- 3) Evento: modo de valor total (automatico/manual)
ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS modo_valor_total VARCHAR(20) NOT NULL DEFAULT 'manual'
CHECK (modo_valor_total IN ('automatico', 'manual'));

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS valor_total_servicos_calculado DECIMAL(10, 2);

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS motivo_ajuste_valor_total TEXT;

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS valor_total_ajustado_por VARCHAR(255);

ALTER TABLE eventos
ADD COLUMN IF NOT EXISTS valor_total_ajustado_em TIMESTAMP WITH TIME ZONE;

-- Backfill do valor_total_servicos_calculado com base nos servicos ativos do evento
UPDATE eventos e
SET valor_total_servicos_calculado = COALESCE(agg.total, 0)
FROM (
  SELECT evento_id, SUM(COALESCE(valor_total_item, COALESCE(quantidade, 1) * COALESCE(valor_unitario, 0))) AS total
  FROM servicos_evento
  WHERE COALESCE(removido, false) = false
  GROUP BY evento_id
) agg
WHERE agg.evento_id = e.id;

UPDATE eventos
SET valor_total_servicos_calculado = 0
WHERE valor_total_servicos_calculado IS NULL;

CREATE INDEX IF NOT EXISTS idx_servicos_evento_evento_removido_preco
ON servicos_evento(evento_id, removido, valor_total_item);

-- 4) Historico de alteracoes de valor (compatibilidade/auditoria)
CREATE TABLE IF NOT EXISTS servicos_evento_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR(255) NOT NULL DEFAULT 'default',
  evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  servico_evento_id VARCHAR(255) NOT NULL REFERENCES servicos_evento(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  valor_unitario_anterior DECIMAL(10, 2),
  valor_unitario_novo DECIMAL(10, 2),
  quantidade_anterior INTEGER,
  quantidade_nova INTEGER,
  valor_total_item_anterior DECIMAL(10, 2),
  valor_total_item_novo DECIMAL(10, 2),
  motivo_ajuste TEXT,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_evento_hist_evento ON servicos_evento_historico(evento_id, data_alteracao DESC);
CREATE INDEX IF NOT EXISTS idx_servicos_evento_hist_servico ON servicos_evento_historico(servico_evento_id, data_alteracao DESC);

CREATE TABLE IF NOT EXISTS eventos_valor_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id VARCHAR(255) NOT NULL DEFAULT 'default',
  evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  user_id VARCHAR(255),
  modo_valor_anterior VARCHAR(20),
  modo_valor_novo VARCHAR(20),
  valor_total_anterior DECIMAL(10, 2),
  valor_total_novo DECIMAL(10, 2),
  valor_total_servicos_anterior DECIMAL(10, 2),
  valor_total_servicos_novo DECIMAL(10, 2),
  motivo_ajuste TEXT,
  data_alteracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_valor_hist_evento ON eventos_valor_historico(evento_id, data_alteracao DESC);
