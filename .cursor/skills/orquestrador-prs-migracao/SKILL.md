---
name: orquestrador-prs-migracao
description: Estrutura migrações grandes em PRs incrementais com ordem segura, compatibilidade e critérios de aceite. Use para mudanças transversais em banco, backend e frontend.
---

# Orquestrador de PRs de Migração

## Objetivo
Quebrar uma migração ampla em PRs pequenos, revisáveis e com baixo risco.

## Modelo recomendado
1. **PR banco (compatibilidade)**
   - adicionar novo canônico + manter legado.
2. **PR backend**
   - dual-read/dual-write.
3. **PR frontend**
   - consumir canônico, manter fallback.
4. **PR limpeza**
   - remover legado quando estável.

## Para cada PR
- Escopo fechado.
- Arquivos em ordem de alteração.
- Riscos.
- Test plan.
- Critério de rollback.

## Template
```markdown
## PRx — <titulo>

### Escopo
- ...

### Ordem de alteração
1. `...`
2. `...`

### Compatibilidade
- ...

### Test plan
- [ ] ...
```
