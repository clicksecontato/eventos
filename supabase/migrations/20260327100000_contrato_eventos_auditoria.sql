-- Fase 1: histórico append-only de eventos do ciclo de vida do contrato
CREATE TABLE IF NOT EXISTS contrato_eventos_auditoria (
  id VARCHAR(255) PRIMARY KEY,
  contrato_id VARCHAR(255) NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  tipo_evento VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  criado_em TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrato_eventos_auditoria_contrato_criado
  ON contrato_eventos_auditoria(contrato_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_contrato_eventos_auditoria_user
  ON contrato_eventos_auditoria(user_id);

COMMENT ON TABLE contrato_eventos_auditoria IS 'Eventos imutáveis de auditoria do contrato (sem UPDATE/DELETE pela aplicação).';
