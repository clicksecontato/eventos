-- ============================================
-- Script para verificar tipos de colunas
-- Execute este script para verificar se há colunas UUID que deveriam ser VARCHAR(255)
-- ============================================

-- Verificar todas as colunas que ainda são UUID
SELECT 
    table_name, 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
    AND data_type = 'uuid'
    AND column_name IN ('id', 'user_id', 'cliente_id', 'evento_id', 'tipo_evento_id', 'tipo_custo_id', 'tipo_servico_id', 'canal_entrada_id', 'pagamento_id', 'modelo_contrato_id', 'anexo_id', 'criado_por')
ORDER BY table_name, column_name;

-- Verificar foreign keys que podem estar com tipos incompatíveis
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND (kcu.column_name LIKE '%_id' OR kcu.column_name = 'id')
ORDER BY tc.table_name, kcu.column_name;














