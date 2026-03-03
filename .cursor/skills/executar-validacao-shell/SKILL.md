---
name: executar-validacao-shell
description: Executa validação técnica com subagent shell (migração, tsc, lint, checks) e retorna status por etapa. Use quando houver mudanças de banco/backend e necessidade de evidência de estabilidade.
---

# Executar Validação com Shell

## Objetivo
Padronizar execução de validações técnicas no terminal com resultado auditável.

## Instruções
1. Defina checklist de validação da tarefa.
2. Acione subagent `shell`.
3. Execute em sequência:
   - validação de migração (se aplicável),
   - `tsc --noEmit`,
   - lints dos arquivos tocados,
   - comandos de verificação combinados.
4. Retorne uma tabela de status.

## Saída padrão
```markdown
## Validação Técnica

| Etapa | Status | Observação |
|---|---|---|
| Migração | feito/falhou/pendente | ... |
| Typecheck | ... | ... |
| Lint | ... | ... |
| Smoke básico | ... | ... |
```
