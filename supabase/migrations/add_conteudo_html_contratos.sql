-- Adicionar coluna conteudo_html em contratos
-- Armazena o HTML editado pelo usuário antes de salvar (opcional).
-- Se preenchido, é usado ao gerar PDF; caso contrário, processa o template.

ALTER TABLE contratos
ADD COLUMN IF NOT EXISTS conteudo_html TEXT;

COMMENT ON COLUMN contratos.conteudo_html IS 'HTML do contrato editado pelo usuário antes de salvar. Usado no PDF quando preenchido; senão, processa o template com dados_preenchidos.';
