---
name: agente-orquestrador-testes
description: Orquestra ciclos de teste ponta a ponta usando as skills de planejar, criar e analisar testes em sequência. Use quando o usuário pedir execução completa de estratégia de testes, evolução de cobertura por lotes ou ciclo contínuo de qualidade de testes.
---

# Agente Orquestrador de Testes

## Objetivo
Executar um ciclo completo e repetível de qualidade de testes:
`planejar -> criar -> analisar`.

## Skills utilizadas
- `planejar-testes-estrategia`
- `criar-testes-implementacao`
- `analisar-testes-qualidade`

## Fluxo de execução
1. **Planejar**
   - aplicar `planejar-testes-estrategia`;
   - definir lotes e critérios de aceite.
2. **Criar**
   - aplicar `criar-testes-implementacao`;
   - implementar por lote, validando testes focados e suíte.
3. **Analisar**
   - aplicar `analisar-testes-qualidade`;
   - registrar lacunas remanescentes e próximos lotes.
4. **Iterar**
   - repetir o ciclo até atingir a cobertura alvo acordada.

## Regras do agente
- Priorizar sempre módulos de maior risco primeiro.
- Não encerrar execução em plano: implementar e validar.
- Reportar resultado com status por lote: `feito/falhou/pendente`.
- Explicitar riscos residuais mesmo quando tudo passa.

## Saída padrão
```markdown
## Execução do Ciclo de Testes

### Lote 1
- planejamento:
- implementação:
- análise:
- status:

### Lote 2
...

### Riscos Residuais
- item:
```
