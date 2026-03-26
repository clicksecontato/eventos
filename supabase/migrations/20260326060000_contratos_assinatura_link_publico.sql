-- Convites de assinatura por link público (cliente externo, sem login)
CREATE TABLE IF NOT EXISTS contratos_assinatura_convites (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contrato_id VARCHAR(255) NOT NULL REFERENCES contratos(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'acessado', 'assinado', 'expirado', 'cancelado')),
  nome_destinatario VARCHAR(255),
  email_destinatario VARCHAR(255),
  acessado_em TIMESTAMP WITH TIME ZONE,
  assinado_em TIMESTAMP WITH TIME ZONE,
  nome_signatario VARCHAR(255),
  email_signatario VARCHAR(255),
  ip_assinatura VARCHAR(100),
  user_agent_assinatura TEXT,
  expira_em TIMESTAMP WITH TIME ZONE NOT NULL,
  data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_assinatura_convites_user_id
  ON contratos_assinatura_convites(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_assinatura_convites_contrato_id
  ON contratos_assinatura_convites(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_assinatura_convites_status_expira
  ON contratos_assinatura_convites(status, expira_em);

