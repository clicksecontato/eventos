-- Novo status para fechamento definitivo do documento.
-- Quando todos os signatários assinarem, o contrato deve ir para document_closed.

ALTER TABLE contratos
  DROP CONSTRAINT IF EXISTS contratos_status_check;

ALTER TABLE contratos
  ADD CONSTRAINT contratos_status_check
  CHECK (status IN ('rascunho', 'gerado', 'assinado', 'document_closed', 'cancelado'));
