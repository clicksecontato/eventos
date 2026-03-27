-- Fortalecimento do fluxo de assinatura eletrônica por link (OTP, auditoria, integridade do documento)
ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS acessos_contador INTEGER NOT NULL DEFAULT 0;

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS contrato_ref_hash VARCHAR(64);

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_codigo_hash VARCHAR(64);

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_expira_em TIMESTAMPTZ;

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_tentativas INTEGER NOT NULL DEFAULT 0;

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_verificado_em TIMESTAMPTZ;

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_total_envios INTEGER NOT NULL DEFAULT 0;

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_ultimo_envio_em TIMESTAMPTZ;

ALTER TABLE contratos_assinatura_convites
  ADD COLUMN IF NOT EXISTS otp_bloqueado_ate TIMESTAMPTZ;

COMMENT ON COLUMN contratos_assinatura_convites.contrato_ref_hash IS 'SHA-256 de id+pdfPath+dataAtualizacao do contrato no momento do convite; invalida link se o PDF for regenerado.';
COMMENT ON COLUMN contratos_assinatura_convites.otp_verificado_em IS 'Confirmação de posse do e-mail antes de exibir o PDF para assinatura.';
