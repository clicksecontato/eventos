-- ============================================
-- SEED DE VALORES PADRAO (SUPABASE)
-- ============================================
-- Objetivo:
--   Popular tabelas de configuracao por usuario com valores padrao.
-- Requisitos:
--   - Schema ja criado (supabase/schema.sql)
--   - Tabela users populada
--   - Extensao uuid-ossp habilitada (ja criada no schema.sql)
--
-- Caracteristicas:
--   - Idempotente (pode rodar varias vezes)
--   - Nao sobrescreve dados existentes
--   - Insere apenas registros faltantes por (user_id, nome)
-- ============================================

BEGIN;

-- ============================================
-- CANAIS DE ENTRADA
-- ============================================
INSERT INTO canais_entrada (id, user_id, nome, descricao, ativo, data_cadastro)
SELECT
  uuid_generate_v4()::text,
  u.id,
  d.nome,
  d.descricao,
  true,
  NOW()
FROM users u
CROSS JOIN (
  VALUES
    ('instagram', 'Origem: Instagram'),
    ('indicação', 'Origem: Indicação'),
    ('outros', 'Origem: Outros')
) AS d(nome, descricao)
ON CONFLICT (user_id, nome) DO NOTHING;

-- ============================================
-- SERVICOS (CATALOGO)
-- ============================================
INSERT INTO servicos (id, user_id, nome, descricao, ativo, data_cadastro)
SELECT
  uuid_generate_v4()::text,
  u.id,
  d.nome,
  d.descricao,
  true,
  NOW()
FROM users u
CROSS JOIN (
  VALUES
    ('totem fotográfico', 'Serviço de totem fotográfico'),
    ('instaprint', 'Serviço de Instaprint'),
    ('outros', 'Outros serviços')
) AS d(nome, descricao)
ON CONFLICT (user_id, nome) DO NOTHING;

-- ============================================
-- TIPOS DE CUSTO
-- ============================================
INSERT INTO tipo_custos (id, user_id, nome, descricao, ativo, data_cadastro)
SELECT
  uuid_generate_v4()::text,
  u.id,
  d.nome,
  d.descricao,
  true,
  NOW()
FROM users u
CROSS JOIN (
  VALUES
    ('insumos', 'Custos de insumos'),
    ('transporte', 'Custos de transporte'),
    ('promotor', 'Custos com promotor'),
    ('outros', 'Outros custos')
) AS d(nome, descricao)
ON CONFLICT (user_id, nome) DO NOTHING;

-- ============================================
-- TIPOS DE EVENTO
-- ============================================
INSERT INTO tipo_eventos (id, user_id, nome, descricao, ativo, data_cadastro)
SELECT
  uuid_generate_v4()::text,
  u.id,
  d.nome,
  d.descricao,
  true,
  NOW()
FROM users u
CROSS JOIN (
  VALUES
    ('Casamento', 'Cerimônias e recepções matrimoniais'),
    ('Aniversário infantil', 'Festas para crianças'),
    ('Aniversário adulto', 'Celebrações para adultos'),
    ('15 anos', 'Festas de debutante'),
    ('Outros', 'Eventos personalizados ou diferentes do padrão')
) AS d(nome, descricao)
ON CONFLICT (user_id, nome) DO NOTHING;

COMMIT;

