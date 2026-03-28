-- Fase 2: partes do contrato e signatários (paralelo na v1; ordem reservada para fase sequencial)
CREATE TABLE IF NOT EXISTS contrato_partes (
  id VARCHAR(255) PRIMARY KEY,
  contrato_id VARCHAR(255) NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  papel VARCHAR(80) NOT NULL,
  ordem_assinatura INTEGER,
  obrigatoria BOOLEAN NOT NULL DEFAULT true,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrato_partes_contrato ON contrato_partes(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_partes_user ON contrato_partes(user_id);

CREATE TABLE IF NOT EXISTS contrato_parte_signatarios (
  id VARCHAR(255) PRIMARY KEY,
  parte_id VARCHAR(255) NOT NULL REFERENCES contrato_partes(id) ON DELETE CASCADE,
  contrato_id VARCHAR(255) NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  documento VARCHAR(100),
  status VARCHAR(30) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'convite_enviado', 'assinado', 'recusado', 'expirado')),
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contrato_parte_signatarios_contrato ON contrato_parte_signatarios(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contrato_parte_signatarios_parte ON contrato_parte_signatarios(parte_id);
CREATE INDEX IF NOT EXISTS idx_contrato_parte_signatarios_user ON contrato_parte_signatarios(user_id);

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS signatario_id VARCHAR(255) REFERENCES contrato_parte_signatarios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_convites_signatario ON contratos_assinatura_convites(signatario_id);

COMMENT ON TABLE contrato_partes IS 'Papéis/parte no contrato (cliente, contratante, etc.).';
COMMENT ON TABLE contrato_parte_signatarios IS 'Pessoas que devem assinar vinculadas a uma parte.';
COMMENT ON COLUMN contratos_assinatura_convites.signatario_id IS 'Opcional: convite amarrado a signatário cadastrado (Fase 2).';
