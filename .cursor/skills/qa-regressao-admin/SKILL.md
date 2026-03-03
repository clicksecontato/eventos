---
name: qa-regressao-admin
description: Executa regressão dos fluxos administrativos de usuários, status e permissões. Use após mudanças em autenticação, assinatura/plano, status de acesso e telas do painel admin.
---

# QA Regressão Admin

## Objetivo
Garantir que operações administrativas continuam estáveis após mudanças.

## Cenários
- Criar usuário no admin.
- Alterar status do usuário.
- Alterar plano/perfil.
- Validar acesso a módulos por role/plano.
- Validar mensagens de bloqueio para status não ativos.

## Critérios de aceite
- Nenhum erro em atualização de status/plano.
- Permissões coerentes com role/plano.
- Fluxos críticos do admin sem regressão visual/funcional.

## Saída
```markdown
## QA Admin
- Usuário: ✅/❌
- Status: ✅/❌
- Plano: ✅/❌
- Permissões: ✅/❌
- Bloqueios UI: ✅/❌
```
