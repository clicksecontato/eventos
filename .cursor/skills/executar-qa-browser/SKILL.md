---
name: executar-qa-browser
description: Executa QA funcional no navegador com subagent browser-use e retorna checklist de cenários com evidências. Use quando houver alteração em fluxo de tela, formulários, modais e persistência de dados.
---

# Executar QA com Browser-use

## Objetivo
Validar comportamento funcional real da interface após mudanças.

## Instruções
1. Defina cenário(s) críticos do fluxo.
2. Acione subagent `browser-use`.
3. Executar:
   - cenário principal,
   - cenário de erro,
   - confirmação após reload.
4. Registrar resultado por passo com evidência.

## Saída padrão
```markdown
## QA Funcional
- [✅/❌] Cenário principal
- [✅/❌] Cenário de erro
- [✅/❌] Persistência após reload

### Evidências
- ...
```
