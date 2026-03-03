---
name: pipeline-validacao-migracao
description: Executa pipeline seguro de migração com verificação técnica e funcional. Use ao aplicar migrations Supabase, refactors de schema ou transições de nomenclatura que exigem validação pós-execução.
---

# Pipeline de Validação de Migração

## Objetivo
Padronizar execução de migração com validação mínima obrigatória.

## Pipeline
1. **Pré-check**
   - Confirmar migration alvo.
   - Confirmar backup/snapshot disponível.
2. **Aplicação**
   - Executar SQL da migration no ambiente correto.
3. **Verificação de estrutura**
   - Tabelas/views/colunas/FKs/índices/triggers esperados.
4. **Verificação de consistência**
   - Backfill, divergências, nulls indevidos, contagens.
5. **Validação de app**
   - `yarn -s tsc --noEmit`
   - lints dos arquivos alterados.
6. **Smoke test**
   - Fluxo crítico da feature migrada.

## Saída padrão
```markdown
## Resultado da Migração <nome>

- Aplicação SQL: ✅/❌
- Estrutura: ✅/❌
- Consistência: ✅/❌
- Typecheck/Lint: ✅/❌
- Smoke: ✅/❌

### Pendências
- ...
```

## Regras
- Nunca pular verificação de estrutura.
- Nunca concluir sem status claro por etapa.
