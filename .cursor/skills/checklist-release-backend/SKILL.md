---
name: checklist-release-backend
description: Gera checklist objetivo de prontidão para release backend com foco em segurança, migrações, compatibilidade e validação. Use antes de deploy de APIs, repositórios ou mudanças em contratos de dados.
---

# Checklist de Release Backend

## Objetivo
Reduzir risco de deploy backend com checklist curto e executável.

## Checklist
- [ ] Migrações aplicadas no ambiente correto.
- [ ] Compatibilidade retroativa preservada (se aplicável).
- [ ] Contratos de API revisados (input/output).
- [ ] Typecheck (`tsc`) sem erro.
- [ ] Lint dos arquivos alterados sem erro novo.
- [ ] Logs de erro críticos tratados (sem catch silencioso em fluxo principal).
- [ ] Feature flag/fallback definido quando necessário.
- [ ] Plano de rollback documentado.

## Entrega
```markdown
## Prontidão de Release Backend

- Status: pronto / pronto com ressalvas / não pronto

### Itens OK
- ...

### Riscos abertos
- ...

### Ação antes do deploy
- ...
```
