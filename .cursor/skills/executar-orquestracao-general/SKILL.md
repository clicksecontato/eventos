---
name: executar-orquestracao-general
description: Orquestra entregas complexas com subagent generalPurpose em etapas executáveis, com risco, dependências e critérios de aceite. Use para planos multi-PR, rollout/rollback e mudanças transversais.
---

# Executar Orquestração com GeneralPurpose

## Objetivo
Transformar tarefas amplas em execução incremental segura.

## Instruções
1. Definir escopo e objetivo final.
2. Acionar subagent `generalPurpose`.
3. Solicitar:
   - etapas em ordem,
   - dependências,
   - critérios de aceite por etapa,
   - estratégia de rollback.
4. Consolidar em plano operacional objetivo.

## Saída padrão
```markdown
## Plano de Execução

### Etapa 1
- objetivo:
- arquivos:
- risco:
- aceite:

### Etapa 2
...
```
