CREATE TABLE IF NOT EXISTS anexos_custo (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    custo_id VARCHAR(255) NOT NULL REFERENCES custos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    tamanho BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anexos_custo_custo_id ON anexos_custo(custo_id);
CREATE INDEX IF NOT EXISTS idx_anexos_custo_evento_id ON anexos_custo(evento_id);
