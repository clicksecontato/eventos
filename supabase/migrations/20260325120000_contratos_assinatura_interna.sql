-- Campos para assinatura interna no PDF (auditoria e PDF original antes da assinatura)
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS pdf_path_original VARCHAR(500);
ALTER TABLE contratos ADD COLUMN IF NOT EXISTS assinatura_auditoria JSONB;

COMMENT ON COLUMN contratos.pdf_path_original IS 'S3 key do PDF gerado antes de incorporar a assinatura manuscrita.';
COMMENT ON COLUMN contratos.assinatura_auditoria IS 'Metadados da assinatura: hashes SHA-256, IP, user-agent, data ISO, IDs do signatário.';
