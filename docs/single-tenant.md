# Arquitetura Single-Tenant

## Decisão oficial

Este projeto passa a operar em modo **single-tenant**.

- A empresa é identificada por `empresa_id`.
- O valor padrão é `default`.
- Todos os usuários autenticados pertencem à mesma empresa.
- O controle de acesso é feito por `role` e funcionalidades/plano.

## Modelo de dados

- `empresa_id` é obrigatório nas tabelas de domínio do Supabase.
- `user_id` permanece para auditoria (quem criou/atualizou), não para isolamento de tenant.
- Consultas deixam de usar `user_id` como filtro de visibilidade de dados.

## Regras de visibilidade

- Usuários da mesma empresa compartilham os dados corporativos.
- Restrições de uso são aplicadas por permissões de perfil e funcionalidades habilitadas.

## Observações de migração

- Para ambientes existentes, aplicar o script `supabase/migrations/20260226_single_tenant_empresa_id.sql`.
- Para novos ambientes, aplicar `supabase/schema.sql` e, em seguida, o script de migração single-tenant.

