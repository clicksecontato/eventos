---
name: auditoria-single-tenant
description: Audita resíduos de arquitetura multi-tenant e verifica aderência ao modelo single-tenant com empresa fixa. Use quando revisar filtros de dados, autorização por role/plano e consistência de empresa_id no backend e banco.
---

# Auditoria Single-Tenant

## Objetivo
Garantir que o projeto siga o modelo single-tenant (empresa única), com autorização por role/plano e sem isolamento por dono de registro.

## Verificações obrigatórias
- Uso de `empresa_id` em queries de domínio.
- `user_id` apenas para auditoria/autoria, não para escopo tenant.
- Endpoints com autorização por role/plano.
- Repositórios sem dependência de ownership por usuário.
- Migrações e índices coerentes com o padrão atual.

## Fluxo
1. **Mapear queries**
   - Identificar filtros de tenant em repositórios e serviços.
2. **Mapear autorização**
   - Verificar guards por papel/plano em API routes.
3. **Checar banco**
   - Confirmar colunas `empresa_id`, defaults, índices e políticas.
4. **Listar desvios**
   - Classificar em bloqueante e melhoria.
5. **Propor correções**
   - Entregar mudanças por prioridade.

## Saída esperada
```markdown
## Auditoria Single-Tenant

- Status geral: <ok/parcial/crítico>

### Bloqueantes
- <arquivo>: <problema> -> <correção>

### Melhorias
- <arquivo>: <problema> -> <correção>

### Evidências
- filtros encontrados
- políticas/índices confirmados
```
