-- Migration: Adicionar índices para otimizar query de valores atrasados
-- Data: 2025-01-24

-- Índice para otimizar busca de eventos com valores atrasados
-- Filtra eventos não arquivados com valor e data de vencimento
CREATE INDEX IF NOT EXISTS idx_eventos_dia_final_pagamento_atrasado 
  ON eventos(user_id, dia_final_pagamento) 
  WHERE arquivado = false AND valor_total > 0 AND dia_final_pagamento IS NOT NULL;

-- Índice para otimizar busca de pagamentos por evento e status
-- Filtra pagamentos não cancelados
CREATE INDEX IF NOT EXISTS idx_pagamentos_evento_status 
  ON pagamentos(evento_id, status) 
  WHERE cancelado = false;
