---
name: criar-testes-implementacao
description: Implementa testes automatizados com foco em contratos, fluxos críticos e regressão, seguindo padrão existente do repositório. Use quando o usuário pedir para criar, expandir ou finalizar testes em frontend, backend ou APIs.
---

# Criar Testes (Implementação)

## Objetivo
Implementar testes consistentes com o padrão do projeto, mantendo estabilidade da suíte.

## Instruções
1. Reutilizar padrão de mocks e estrutura já existente no módulo.
2. Cobrir primeiro casos de maior valor:
   - sucesso do fluxo principal,
   - validação de entrada,
   - erro relevante.
3. Para UI, priorizar comportamento observável:
   - renderização de estado,
   - ação de usuário,
   - feedback/efeito (toast, navegação, atualização).
4. Para API, validar contrato:
   - payload de resposta,
   - status code esperado,
   - dependências chamadas com argumentos corretos.
5. Rodar testes focados do escopo alterado e, ao final, suíte completa.
6. Verificar lint nos arquivos alterados.

## Checklist operacional
```markdown
- [ ] testes criados para sucesso
- [ ] testes criados para validação/erro
- [ ] testes focados passando
- [ ] suíte completa passando
- [ ] lint sem novos erros
```

## Saída padrão
```markdown
## Resultado da Implementação de Testes
- arquivos criados/alterados:
- cenários cobertos:
- validação local:
- riscos remanescentes:
```
