---
name: executar-mapeamento-explore
description: Executa mapeamento técnico amplo usando subagent explore e devolve impacto por camada, risco e ordem de execução. Use quando houver refactor transversal, renomeação de domínio ou investigação em múltiplos arquivos.
---

# Executar Mapeamento com Explore

## Objetivo
Usar subagent `explore` para levantar impacto de mudanças amplas de forma rápida.

## Instruções
1. Defina claramente o tema de mapeamento (ex.: `tipo_servicos` -> `servicos`).
2. Acione subagent `explore`.
3. Solicite retorno estruturado:
   - arquivos por camada,
   - risco por item,
   - ordem segura de alteração,
   - lacunas/unknowns.
4. Consolidar resultado em plano objetivo.

## Saída padrão
```markdown
## Mapeamento de Impacto
- Escopo:
- Risco geral:

### Banco
- ...

### Backend
- ...

### Frontend
- ...

### Ordem sugerida
1. ...
2. ...
```
