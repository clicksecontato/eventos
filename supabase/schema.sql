-- ============================================
-- SCHEMA SUPABASE - CLICK-SE SISTEMA
-- Migração completa do Firebase Firestore
-- ============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para busca de texto

-- ============================================
-- TABELAS PRINCIPAIS
-- ============================================

-- Tabela de usuários (equivalente a controle_users)
-- IMPORTANTE: id é VARCHAR para compatibilidade com Firebase Auth UID
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY, -- Firebase UID ou UUID string
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    ativo BOOLEAN NOT NULL DEFAULT true,
    
    -- Assinatura (JSONB para flexibilidade)
    assinatura JSONB,
    
    -- Metadados
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Índices
    CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_ativo ON users(ativo) WHERE ativo = true;

-- ============================================
-- TABELAS DE CONFIGURAÇÃO (por usuário)
-- ============================================

-- Canais de entrada
CREATE TABLE IF NOT EXISTS canais_entrada (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_canais_entrada_user_id ON canais_entrada(user_id);
CREATE INDEX IF NOT EXISTS idx_canais_entrada_ativo ON canais_entrada(user_id, ativo) WHERE ativo = true;

-- Tipos de eventos
CREATE TABLE IF NOT EXISTS tipo_eventos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_tipo_eventos_user_id ON tipo_eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_tipo_eventos_ativo ON tipo_eventos(user_id, ativo) WHERE ativo = true;

-- Tipos de custos
CREATE TABLE IF NOT EXISTS tipo_custos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_tipo_custos_user_id ON tipo_custos(user_id);
CREATE INDEX IF NOT EXISTS idx_tipo_custos_ativo ON tipo_custos(user_id, ativo) WHERE ativo = true;

-- Tipos de serviços
CREATE TABLE IF NOT EXISTS tipo_servicos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id, nome)
);

CREATE INDEX IF NOT EXISTS idx_tipo_servicos_user_id ON tipo_servicos(user_id);
CREATE INDEX IF NOT EXISTS idx_tipo_servicos_ativo ON tipo_servicos(user_id, ativo) WHERE ativo = true;

-- ============================================
-- TABELAS DE DADOS PRINCIPAIS
-- ============================================

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    cep VARCHAR(10),
    instagram VARCHAR(255),
    canal_entrada_id VARCHAR(255) REFERENCES canais_entrada(id) ON DELETE SET NULL,
    arquivado BOOLEAN NOT NULL DEFAULT false,
    data_arquivamento TIMESTAMP WITH TIME ZONE,
    motivo_arquivamento TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_arquivado ON clientes(user_id, arquivado) WHERE arquivado = false;
CREATE INDEX IF NOT EXISTS idx_clientes_canal_entrada ON clientes(canal_entrada_id);
CREATE INDEX IF NOT EXISTS idx_clientes_nome_trgm ON clientes USING gin(nome gin_trgm_ops); -- Busca de texto

-- Índice único parcial para CPF (apenas quando CPF não é NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_user_cpf_unique ON clientes(user_id, cpf) WHERE cpf IS NOT NULL;

-- Eventos
CREATE TABLE IF NOT EXISTS eventos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cliente_id VARCHAR(255) NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
    nome_evento VARCHAR(255),
    data_evento TIMESTAMP WITH TIME ZONE NOT NULL,
    dia_semana VARCHAR(20),
    local VARCHAR(255) NOT NULL,
    endereco TEXT,
    tipo_evento VARCHAR(255) NOT NULL,
    tipo_evento_id VARCHAR(255) REFERENCES tipo_eventos(id) ON DELETE SET NULL,
    saida VARCHAR(50),
    chegada_no_local VARCHAR(50),
    horario_inicio VARCHAR(50),
    horario_desmontagem VARCHAR(50),
    tempo_evento VARCHAR(50),
    contratante VARCHAR(255),
    numero_convidados INTEGER NOT NULL DEFAULT 0,
    quantidade_mesas INTEGER,
    hashtag VARCHAR(255),
    numero_impressoes INTEGER,
    cerimonialista JSONB, -- { nome, telefone }
    observacoes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Agendado' CHECK (status IN ('Agendado', 'Confirmado', 'Em andamento', 'Concluído', 'Cancelado')),
    valor_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    dia_final_pagamento TIMESTAMP WITH TIME ZONE,
    arquivado BOOLEAN NOT NULL DEFAULT false,
    data_arquivamento TIMESTAMP WITH TIME ZONE,
    motivo_arquivamento TEXT,
    google_calendar_event_id VARCHAR(255),
    google_calendar_synced_at TIMESTAMP WITH TIME ZONE,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eventos_user_id ON eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_eventos_cliente_id ON eventos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_eventos_data_evento ON eventos(data_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_arquivado ON eventos(user_id, arquivado) WHERE arquivado = false;
CREATE INDEX IF NOT EXISTS idx_eventos_status ON eventos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_eventos_tipo_evento ON eventos(user_id, tipo_evento);
CREATE INDEX IF NOT EXISTS idx_eventos_data_evento_range ON eventos(user_id, data_evento) WHERE arquivado = false;

-- Pagamentos (collection global)
CREATE TABLE IF NOT EXISTS pagamentos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    valor DECIMAL(10, 2) NOT NULL,
    data_pagamento TIMESTAMP WITH TIME ZONE NOT NULL,
    forma_pagamento VARCHAR(50) NOT NULL CHECK (forma_pagamento IN ('Dinheiro', 'Cartão de crédito', 'Depósito bancário', 'PIX', 'Transferência')),
    status VARCHAR(50) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pago', 'Pendente', 'Atrasado', 'Cancelado')),
    observacoes TEXT,
    comprovante TEXT,
    anexo_id VARCHAR(255),
    cancelado BOOLEAN NOT NULL DEFAULT false,
    data_cancelamento TIMESTAMP WITH TIME ZONE,
    motivo_cancelamento TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_user_id ON pagamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_evento_id ON pagamentos(evento_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON pagamentos(user_id, status) WHERE cancelado = false;
CREATE INDEX IF NOT EXISTS idx_pagamentos_data_pagamento ON pagamentos(data_pagamento);

-- Anexos de pagamento
CREATE TABLE IF NOT EXISTS anexos_pagamento (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    pagamento_id VARCHAR(255) NOT NULL REFERENCES pagamentos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    tamanho BIGINT NOT NULL,
    s3_key VARCHAR(500) NOT NULL,
    url TEXT NOT NULL,
    data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anexos_pagamento_pagamento_id ON anexos_pagamento(pagamento_id);
CREATE INDEX IF NOT EXISTS idx_anexos_pagamento_evento_id ON anexos_pagamento(evento_id);

-- Custos (collection global)
CREATE TABLE IF NOT EXISTS custos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_custo_id VARCHAR(255) NOT NULL REFERENCES tipo_custos(id) ON DELETE RESTRICT,
    valor DECIMAL(10, 2) NOT NULL,
    quantidade INTEGER DEFAULT 1,
    observacoes TEXT,
    removido BOOLEAN NOT NULL DEFAULT false,
    data_remocao TIMESTAMP WITH TIME ZONE,
    motivo_remocao TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custos_user_id ON custos(user_id);
CREATE INDEX IF NOT EXISTS idx_custos_evento_id ON custos(evento_id);
CREATE INDEX IF NOT EXISTS idx_custos_removido ON custos(evento_id, removido) WHERE removido = false;

-- Anexos de custo
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

-- Serviços de evento (collection global)
CREATE TABLE IF NOT EXISTS servicos_evento (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    tipo_servico_id VARCHAR(255) NOT NULL REFERENCES tipo_servicos(id) ON DELETE RESTRICT,
    observacoes TEXT,
    removido BOOLEAN NOT NULL DEFAULT false,
    data_remocao TIMESTAMP WITH TIME ZONE,
    motivo_remocao TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_servicos_evento_user_id ON servicos_evento(user_id);
CREATE INDEX IF NOT EXISTS idx_servicos_evento_evento_id ON servicos_evento(evento_id);
CREATE INDEX IF NOT EXISTS idx_servicos_evento_removido ON servicos_evento(evento_id, removido) WHERE removido = false;

-- Pré-Cadastros de Eventos
CREATE TABLE IF NOT EXISTS pre_cadastros_eventos (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Dados do Cliente (preenchidos pelo cliente)
    cliente_nome VARCHAR(255),
    cliente_email VARCHAR(255),
    cliente_telefone VARCHAR(50),
    cliente_cpf VARCHAR(20),
    cliente_endereco TEXT,
    cliente_cep VARCHAR(10),
    cliente_instagram VARCHAR(255),
    cliente_canal_entrada_id VARCHAR(255) REFERENCES canais_entrada(id) ON DELETE SET NULL,
    
    -- Dados do Evento (preenchidos pelo cliente)
    nome_evento VARCHAR(255),
    data_evento TIMESTAMP WITH TIME ZONE,
    local VARCHAR(255),
    endereco TEXT,
    tipo_evento VARCHAR(255),
    tipo_evento_id VARCHAR(255) REFERENCES tipo_eventos(id) ON DELETE SET NULL,
    contratante VARCHAR(255),
    numero_convidados INTEGER DEFAULT 0,
    quantidade_mesas INTEGER,
    hashtag VARCHAR(255),
    horario_inicio VARCHAR(50),
    horario_termino VARCHAR(50), -- Horário de Desmontagem
    cerimonialista JSONB, -- { nome, telefone }
    observacoes TEXT,
    
    -- Metadados
    status VARCHAR(50) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'preenchido', 'convertido', 'expirado', 'ignorado')),
    data_expiracao TIMESTAMP WITH TIME ZONE NOT NULL, -- 7 dias após criação
    data_preenchimento TIMESTAMP WITH TIME ZONE,
    data_conversao TIMESTAMP WITH TIME ZONE, -- Quando foi convertido em evento
    evento_id VARCHAR(255) REFERENCES eventos(id) ON DELETE SET NULL, -- ID do evento criado a partir deste pré-cadastro
    cliente_id VARCHAR(255) REFERENCES clientes(id) ON DELETE SET NULL, -- ID do cliente criado/utilizado
    
    -- Timestamps
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_cadastros_user_id ON pre_cadastros_eventos(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_cadastros_status ON pre_cadastros_eventos(user_id, status);
CREATE INDEX IF NOT EXISTS idx_pre_cadastros_data_expiracao ON pre_cadastros_eventos(data_expiracao) WHERE status NOT IN ('expirado', 'convertido');
CREATE INDEX IF NOT EXISTS idx_pre_cadastros_cliente_email ON pre_cadastros_eventos(user_id, cliente_email);

-- Serviços dos Pré-Cadastros
CREATE TABLE IF NOT EXISTS pre_cadastros_servicos (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pre_cadastro_id VARCHAR(255) NOT NULL REFERENCES pre_cadastros_eventos(id) ON DELETE CASCADE,
    tipo_servico_id VARCHAR(255) NOT NULL REFERENCES tipo_servicos(id) ON DELETE RESTRICT,
    observacoes TEXT,
    removido BOOLEAN NOT NULL DEFAULT false,
    data_remocao TIMESTAMP WITH TIME ZONE,
    motivo_remocao TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pre_cadastros_servicos_user_id ON pre_cadastros_servicos(user_id);
CREATE INDEX IF NOT EXISTS idx_pre_cadastros_servicos_pre_cadastro_id ON pre_cadastros_servicos(pre_cadastro_id);
CREATE INDEX IF NOT EXISTS idx_pre_cadastros_servicos_removido ON pre_cadastros_servicos(pre_cadastro_id, removido) WHERE removido = false;

-- Anexos de eventos
CREATE TABLE IF NOT EXISTS anexos_eventos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('PDF', 'Imagem', 'Documento', 'Outro')),
    url TEXT NOT NULL,
    tamanho BIGINT NOT NULL,
    data_upload TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anexos_eventos_evento_id ON anexos_eventos(evento_id);

-- ============================================
-- TABELAS DE CONTRATOS
-- ============================================

-- Modelos de contrato
CREATE TABLE IF NOT EXISTS modelos_contrato (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    template TEXT NOT NULL,
    campos JSONB NOT NULL, -- Array de CampoContrato
    ativo BOOLEAN NOT NULL DEFAULT true,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE, -- NULL = modelo global, preenchido = template privado do usuário
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_modelos_contrato_ativo ON modelos_contrato(ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_modelos_contrato_user_id ON modelos_contrato(user_id);
CREATE INDEX IF NOT EXISTS idx_modelos_contrato_user_ativo ON modelos_contrato(user_id, ativo) WHERE ativo = true;

-- Variáveis customizáveis de contratos (por usuário)
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

-- Configuração de contrato (por usuário)
CREATE TABLE IF NOT EXISTS configuracao_contrato (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(18) NOT NULL,
    inscricao_estadual VARCHAR(50),
    endereco JSONB NOT NULL, -- { logradouro, numero, complemento, bairro, cidade, estado, cep }
    contato JSONB NOT NULL, -- { telefone, email, site }
    dados_bancarios JSONB, -- { banco, agencia, conta, tipo, pix }
    marca_dagua_url TEXT,
    marca_dagua_s3_key VARCHAR(500),
    marca_dagua_tamanho_percentual INTEGER DEFAULT 70,
    foro VARCHAR(255),
    cidade VARCHAR(255),
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_configuracao_contrato_user_id ON configuracao_contrato(user_id);

-- Compatibilidade para bancos já existentes
ALTER TABLE configuracao_contrato ADD COLUMN IF NOT EXISTS marca_dagua_url TEXT;
ALTER TABLE configuracao_contrato ADD COLUMN IF NOT EXISTS marca_dagua_s3_key VARCHAR(500);
ALTER TABLE configuracao_contrato ADD COLUMN IF NOT EXISTS marca_dagua_tamanho_percentual INTEGER DEFAULT 70;

-- Contratos
CREATE TABLE IF NOT EXISTS contratos (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    evento_id VARCHAR(255) REFERENCES eventos(id) ON DELETE SET NULL,
    modelo_contrato_id VARCHAR(255) NOT NULL REFERENCES modelos_contrato(id) ON DELETE RESTRICT,
    dados_preenchidos JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'gerado', 'assinado', 'cancelado')),
    pdf_url TEXT,
    pdf_path VARCHAR(500),
    numero_contrato VARCHAR(100),
    data_geracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_assinatura TIMESTAMP WITH TIME ZONE,
    assinado_por VARCHAR(255),
    observacoes TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    criado_por VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_evento_id ON contratos(evento_id);
CREATE INDEX IF NOT EXISTS idx_contratos_status ON contratos(user_id, status);

-- ============================================
-- TABELAS DE RELATÓRIOS E CACHE
-- ============================================

-- Relatórios diários (cache)
CREATE TABLE IF NOT EXISTS relatorios_diarios (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID (formato: userId_dateKey)
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date_key VARCHAR(8) NOT NULL, -- yyyyMMdd
    data_geracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    dashboard JSONB,
    detalhamento_receber JSONB,
    receita_mensal JSONB,
    performance_eventos JSONB,
    fluxo_caixa JSONB,
    servicos JSONB,
    canais_entrada JSONB,
    impressoes JSONB,
    
    UNIQUE(user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_relatorios_diarios_user_date ON relatorios_diarios(user_id, date_key);

-- Snapshots de relatórios (cache)
CREATE TABLE IF NOT EXISTS relatorios_cache (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    data_geracao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    periodo_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    periodo_fim TIMESTAMP WITH TIME ZONE NOT NULL,
    resumo_geral JSONB,
    receita_mensal JSONB,
    eventos_resumo JSONB,
    fluxo_caixa JSONB,
    servicos_resumo JSONB,
    canais_entrada_resumo JSONB,
    impressoes_resumo JSONB,
    performance_eventos JSONB,
    
    UNIQUE(user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_relatorios_cache_user_id ON relatorios_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_relatorios_cache_data_geracao ON relatorios_cache(user_id, data_geracao DESC);

-- ============================================
-- TABELAS DE INTEGRAÇÃO
-- ============================================

-- Tokens do Google Calendar
CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    id VARCHAR(255) PRIMARY KEY, -- Firestore ID
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);

-- ============================================
-- FUNÇÕES E TRIGGERS
-- ============================================

-- Função para atualizar data_atualizacao automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger em tabelas com data_atualizacao
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_eventos_updated_at ON eventos;
CREATE TRIGGER update_eventos_updated_at BEFORE UPDATE ON eventos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pagamentos_updated_at ON pagamentos;
CREATE TRIGGER update_pagamentos_updated_at BEFORE UPDATE ON pagamentos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modelos_contrato_updated_at ON modelos_contrato;
CREATE TRIGGER update_modelos_contrato_updated_at BEFORE UPDATE ON modelos_contrato
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configuracao_contrato_updated_at ON configuracao_contrato;
CREATE TRIGGER update_configuracao_contrato_updated_at BEFORE UPDATE ON configuracao_contrato
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contratos_updated_at ON contratos;
CREATE TRIGGER update_contratos_updated_at BEFORE UPDATE ON contratos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_google_calendar_tokens_updated_at ON google_calendar_tokens;
CREATE TRIGGER update_google_calendar_tokens_updated_at BEFORE UPDATE ON google_calendar_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================

COMMENT ON TABLE users IS 'Usuários do sistema (equivalente a controle_users do Firebase)';
COMMENT ON TABLE clientes IS 'Clientes dos usuários';
COMMENT ON TABLE eventos IS 'Eventos agendados';
COMMENT ON TABLE pagamentos IS 'Pagamentos dos eventos (collection global)';
COMMENT ON TABLE custos IS 'Custos dos eventos (collection global)';
COMMENT ON TABLE servicos_evento IS 'Serviços vinculados aos eventos (collection global)';
COMMENT ON TABLE pre_cadastros_eventos IS 'Pré-cadastros de eventos preenchidos por clientes via link público';
COMMENT ON TABLE pre_cadastros_servicos IS 'Serviços vinculados aos pré-cadastros de eventos';

