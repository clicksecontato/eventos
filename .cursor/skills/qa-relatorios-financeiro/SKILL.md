---
name: qa-relatorios-financeiro
description: Valida consistência funcional dos relatórios financeiros e de serviços após mudanças em dados, agregações ou nomenclatura. Use quando alterar regras de cálculo, joins ou campos usados em dashboards e relatórios.
---

# QA Relatórios Financeiros

## Objetivo
Confirmar que relatórios apresentam dados corretos e consistentes.

## Verificações
- Totais de receita/despesa/saldo coerentes.
- Relatório de serviços sem quebras de join.
- Filtros de período funcionando.
- Exportação CSV funcionando.
- Labels e nomes alinhados ao domínio atual.

## Conferências técnicas
- Agregações por `servicoId` com fallback legado.
- Nenhum `undefined`/`NaN` em métricas exibidas.
- Typecheck e lint ok.

## Saída
```markdown
## QA Relatórios
- Fluxo caixa: ✅/❌
- Serviços: ✅/❌
- Receita mensal: ✅/❌
- Exportação: ✅/❌

Riscos:
- ...
```
