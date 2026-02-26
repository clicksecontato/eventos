-- Script para adicionar todas as colunas de relatórios se elas não existirem
-- Execute este script no Supabase SQL Editor para garantir que todas as colunas existam

-- Lista de todas as colunas JSONB que devem existir na tabela relatorios_diarios
DO $$
DECLARE
    colunas_esperadas TEXT[] := ARRAY[
        'dashboard',
        'detalhamento_receber',
        'receita_mensal',
        'performance_eventos',
        'fluxo_caixa',
        'servicos',
        'canais_entrada',
        'impressoes'
    ];
    coluna TEXT;
    coluna_existe BOOLEAN;
    colunas_adicionadas TEXT[] := ARRAY[]::TEXT[];
BEGIN
    -- Verificar e adicionar cada coluna se não existir
    FOREACH coluna IN ARRAY colunas_esperadas
    LOOP
        -- Verificar se a coluna existe
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'relatorios_diarios' 
            AND column_name = coluna
        ) INTO coluna_existe;
        
        -- Se não existir, adicionar
        IF NOT coluna_existe THEN
            EXECUTE format('ALTER TABLE relatorios_diarios ADD COLUMN %I JSONB', coluna);
            colunas_adicionadas := array_append(colunas_adicionadas, coluna);
            RAISE NOTICE 'Coluna % adicionada com sucesso', coluna;
        ELSE
            RAISE NOTICE 'Coluna % já existe', coluna;
        END IF;
    END LOOP;
    
    -- Resumo
    IF array_length(colunas_adicionadas, 1) > 0 THEN
        RAISE NOTICE 'Total de colunas adicionadas: %', array_length(colunas_adicionadas, 1);
        RAISE NOTICE 'Colunas adicionadas: %', array_to_string(colunas_adicionadas, ', ');
    ELSE
        RAISE NOTICE 'Todas as colunas já existem. Nenhuma alteração necessária.';
    END IF;
END $$;

-- Verificar todas as colunas esperadas após a execução
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'relatorios_diarios'
AND column_name IN (
    'dashboard',
    'detalhamento_receber',
    'receita_mensal',
    'performance_eventos',
    'fluxo_caixa',
    'servicos',
    'canais_entrada',
    'impressoes'
)
ORDER BY column_name;
