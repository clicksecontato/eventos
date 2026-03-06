---
name: analisar-testes-qualidade
description: Analisa qualidade da suíte de testes, identifica lacunas, fragilidades e riscos de regressão com recomendações acionáveis. Use quando o usuário pedir review de testes, diagnóstico de cobertura ou análise de confiabilidade da suíte.
---

# Analisar Qualidade dos Testes

## Objetivo
Avaliar se a suíte protege comportamentos críticos com boa confiabilidade.

## Instruções
1. Levantar cobertura existente por camada (UI, API, serviço).
2. Identificar lacunas:
   - fluxos críticos sem teste,
   - ausência de cenários de erro,
   - validações de contrato incompletas.
3. Identificar fragilidades:
   - seletores frágeis,
   - mocks excessivamente permissivos,
   - assertions pouco específicas.
4. Classificar achados por severidade: `crítico`, `alto`, `médio`, `baixo`.
5. Recomendar ações com ordem prática e impacto esperado.

## Saída padrão
```markdown
## Análise de Qualidade da Suíte

### Achados (por severidade)
- [crítico|alto|médio|baixo] item:
  - impacto:
  - recomendação:

### Lacunas de Cobertura
- módulo:
- comportamento não protegido:
- teste sugerido:

### Próximos Passos
1.
2.
3.
```
