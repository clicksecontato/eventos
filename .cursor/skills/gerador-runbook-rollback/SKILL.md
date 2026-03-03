---
name: gerador-runbook-rollback
description: Gera runbook de rollout e rollback para mudanças críticas com passos verificáveis e gatilhos de reversão. Use antes de deploys com migrações, alterações de contrato de dados ou risco operacional elevado.
---

# Gerador de Runbook e Rollback

## Objetivo
Produzir um plano operacional executável para deploy e reversão.

## Estrutura obrigatória
1. Pré-requisitos (backup, janela, responsáveis).
2. Rollout em passos curtos.
3. Verificação após cada passo.
4. Gatilhos de rollback.
5. Procedimento de rollback.
6. Critério de conclusão.

## Template de saída
```markdown
## Runbook <feature>

### Pré-check
- [ ] backup/snapshot
- [ ] migration revisada

### Rollout
1. ...
2. ...

### Verificação
- query/endpoint/tela esperada

### Rollback (se X acontecer)
1. ...
2. ...
```
