-- Migration: Adicionar suporte a variáveis customizáveis e templates personalizados
-- Data: 2025-01-XX
-- Descrição: 
--   1. Cria tabela variaveis_contrato para variáveis customizadas por usuário
--   2. Adiciona user_id em modelos_contrato para templates personalizados

-- ============================================
-- 1. TABELA: variaveis_contrato
-- ============================================
CREATE TABLE IF NOT EXISTS variaveis_contrato (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chave VARCHAR(100) NOT NULL, -- Ex: "nome_empresa", "telefone_comercial"
    label VARCHAR(255) NOT NULL, -- Ex: "Nome da Empresa", "Telefone Comercial"
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('unica', 'multipla')), -- 'unica' = {{}}, 'multipla' = []
    valor_padrao TEXT, -- Valor padrão (opcional)
    descricao TEXT, -- Descrição da variável
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, chave) -- Não pode ter duas variáveis com mesma chave por usuário
);

CREATE INDEX IF NOT EXISTS idx_variaveis_contrato_user_id ON variaveis_contrato(user_id);
CREATE INDEX IF NOT EXISTS idx_variaveis_contrato_user_ativo ON variaveis_contrato(user_id, ativo) WHERE ativo = true;

COMMENT ON TABLE variaveis_contrato IS 'Variáveis customizáveis criadas pelos clientes para usar em templates de contratos';
COMMENT ON COLUMN variaveis_contrato.tipo IS 'unica = {{variavel}} (string simples), multipla = [variavel] (array como string)';

-- ============================================
-- 2. ATUALIZAR: modelos_contrato (adicionar user_id)
-- ============================================
ALTER TABLE modelos_contrato 
ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_modelos_contrato_user_id ON modelos_contrato(user_id);
CREATE INDEX IF NOT EXISTS idx_modelos_contrato_user_ativo ON modelos_contrato(user_id, ativo) WHERE ativo = true;

COMMENT ON COLUMN modelos_contrato.user_id IS 'NULL = modelo global (padrão do sistema), preenchido = template personalizado do usuário';
