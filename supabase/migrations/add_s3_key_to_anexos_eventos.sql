-- Adicionar campo s3_key à tabela anexos_eventos
-- Este campo é necessário para poder deletar arquivos do S3

ALTER TABLE anexos_eventos 
ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);

-- Criar índice para melhorar performance em buscas por s3_key
CREATE INDEX IF NOT EXISTS idx_anexos_eventos_s3_key ON anexos_eventos(s3_key) WHERE s3_key IS NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN anexos_eventos.s3_key IS 'Chave do arquivo no S3, usada para deletar o arquivo quando necessário';

