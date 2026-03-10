-- Módulo de agendamento por profissional com bloqueio de conflito de horário

CREATE EXTENSION IF NOT EXISTS "btree_gist";

CREATE TABLE IF NOT EXISTS agendamento_profissionais (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    empresa_id VARCHAR(255) NOT NULL DEFAULT 'default',
    nome VARCHAR(255) NOT NULL,
    especialidade VARCHAR(255),
    observacoes TEXT,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agendamento_profissionais_empresa_id ON agendamento_profissionais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_profissionais_ativo ON agendamento_profissionais(empresa_id, ativo) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_agendamento_profissionais_nome ON agendamento_profissionais(empresa_id, nome);

CREATE TABLE IF NOT EXISTS agendamento_disponibilidades (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    empresa_id VARCHAR(255) NOT NULL DEFAULT 'default',
    profissional_id VARCHAR(255) NOT NULL REFERENCES agendamento_profissionais(id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT true,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (hora_inicio < hora_fim)
);

CREATE INDEX IF NOT EXISTS idx_agendamento_disponibilidades_profissional ON agendamento_disponibilidades(profissional_id, dia_semana);
CREATE INDEX IF NOT EXISTS idx_agendamento_disponibilidades_empresa_id ON agendamento_disponibilidades(empresa_id);

CREATE TABLE IF NOT EXISTS agendamento_bloqueios (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    empresa_id VARCHAR(255) NOT NULL DEFAULT 'default',
    profissional_id VARCHAR(255) NOT NULL REFERENCES agendamento_profissionais(id) ON DELETE CASCADE,
    inicio_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    fim_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    motivo TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (inicio_ts < fim_ts)
);

CREATE INDEX IF NOT EXISTS idx_agendamento_bloqueios_profissional_periodo ON agendamento_bloqueios(profissional_id, inicio_ts, fim_ts);
CREATE INDEX IF NOT EXISTS idx_agendamento_bloqueios_empresa_id ON agendamento_bloqueios(empresa_id);

CREATE TABLE IF NOT EXISTS agendamento_alocacoes (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    empresa_id VARCHAR(255) NOT NULL DEFAULT 'default',
    evento_id VARCHAR(255) NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
    servico_evento_id VARCHAR(255) REFERENCES servicos_evento(id) ON DELETE SET NULL,
    profissional_id VARCHAR(255) NOT NULL REFERENCES agendamento_profissionais(id) ON DELETE RESTRICT,
    inicio_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    fim_ts TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'confirmado', 'cancelado')),
    observacoes TEXT,
    data_cadastro TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    data_atualizacao TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (inicio_ts < fim_ts)
);

CREATE INDEX IF NOT EXISTS idx_agendamento_alocacoes_profissional_periodo ON agendamento_alocacoes(profissional_id, inicio_ts, fim_ts);
CREATE INDEX IF NOT EXISTS idx_agendamento_alocacoes_evento_id ON agendamento_alocacoes(evento_id);
CREATE INDEX IF NOT EXISTS idx_agendamento_alocacoes_empresa_id ON agendamento_alocacoes(empresa_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agendamento_alocacoes_profissional_intervalo_excl'
  ) THEN
    ALTER TABLE agendamento_alocacoes
      ADD CONSTRAINT agendamento_alocacoes_profissional_intervalo_excl
      EXCLUDE USING gist (
        profissional_id WITH =,
        tstzrange(inicio_ts, fim_ts, '[)') WITH &&
      )
      WHERE (status <> 'cancelado');
  END IF;
END $$;
