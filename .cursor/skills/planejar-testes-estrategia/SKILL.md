---
name: planejar-testes-estrategia
description: Planeja estratégia de testes por risco, escopo e prioridade com matriz de cobertura e sequência de execução. Use quando o usuário pedir plano de testes, backlog de cobertura, estratégia TDD ou priorização de cenários.
---

# Planejar Testes por Estratégia

## Objetivo
Definir um plano executável de testes antes da implementação, com foco em risco de negócio e regressão.

## Instruções
1. Mapear escopo funcional (módulos, rotas, páginas e integrações).
2. Classificar risco por item: `alto`, `médio`, `baixo`.
3. Definir cobertura alvo por camada:
   - API/serviço: contrato, validação e erro.
   - UI: render, interação crítica, estados de erro.
   - integração: fluxos ponta a ponta essenciais.
4. Priorizar execução em lotes (`Lote 1`, `Lote 2`, ...), iniciando por risco alto.
5. Definir critérios de aceite por lote:
   - testes novos passando,
   - regressão existente preservada,
   - sem novos erros de lint/tipo.

## Saída padrão
```markdown
## Plano de Testes

### Matriz de Prioridade
- módulo:
- risco:
- cobertura atual:
- cobertura alvo:

### Lote 1 (alto risco)
- escopo:
- testes a criar:
- aceite:

### Lote 2 (médio risco)
...
```
