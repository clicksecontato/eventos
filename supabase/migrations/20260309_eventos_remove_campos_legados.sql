-- Remove campos legados de eventos e padroniza agendamento (inicio/fim)

ALTER TABLE eventos
  RENAME COLUMN horario_desmontagem TO horario_fim;

ALTER TABLE eventos
  DROP COLUMN IF EXISTS local,
  DROP COLUMN IF EXISTS endereco,
  DROP COLUMN IF EXISTS saida,
  DROP COLUMN IF EXISTS chegada_no_local,
  DROP COLUMN IF EXISTS tempo_evento,
  DROP COLUMN IF EXISTS contratante,
  DROP COLUMN IF EXISTS numero_convidados,
  DROP COLUMN IF EXISTS quantidade_mesas,
  DROP COLUMN IF EXISTS hashtag,
  DROP COLUMN IF EXISTS numero_impressoes,
  DROP COLUMN IF EXISTS cerimonialista;

ALTER TABLE pre_cadastros_eventos
  DROP COLUMN IF EXISTS local,
  DROP COLUMN IF EXISTS endereco,
  DROP COLUMN IF EXISTS contratante,
  DROP COLUMN IF EXISTS numero_convidados,
  DROP COLUMN IF EXISTS quantidade_mesas,
  DROP COLUMN IF EXISTS hashtag,
  DROP COLUMN IF EXISTS cerimonialista;
