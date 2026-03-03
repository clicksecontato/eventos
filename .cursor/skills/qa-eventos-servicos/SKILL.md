---
name: qa-eventos-servicos
description: Executa QA funcional do fluxo de eventos e serviços ponta a ponta. Use quando houver alterações em cadastro de serviços, modal de seleção, precificação por item e sincronização de totais do evento.
---

# QA Eventos e Serviços

## Objetivo
Validar que o fluxo de serviços em evento funciona de ponta a ponta.

## Cenários obrigatórios
1. Abrir evento existente.
2. Adicionar serviços pelo modal e salvar.
3. Confirmar persistência após reload.
4. Editar quantidade/valor unitário.
5. Confirmar atualização de total do item.
6. Confirmar atualização de total do evento (modo automático/manual).
7. Excluir serviço e validar recálculo.
8. Validar histórico de alterações (quando aplicável).

## Evidências mínimas
- Resultado por cenário: ✅/❌.
- Mensagem de erro capturada (se falhar).
- Campos críticos conferidos: `servicoId` e fallback legado.

## Saída
```markdown
## QA Fluxo Eventos/Serviços

### Cenários
- [✅/❌] Adicionar serviço
- [✅/❌] Editar preço
- [✅/❌] Excluir serviço
- [✅/❌] Recalcular total

### Observações
- ...
```
