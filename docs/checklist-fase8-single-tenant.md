# Checklist Fase 8 - Validação e Rollout Single-Tenant

## Objetivo
Fechar a migração para CRM single-tenant com validação funcional, limpeza final de resíduos SaaS e plano de rollout/rollback.

## Status Geral Atual
- [x] Fase 1 (tenant único) aplicada
- [~] Fase 2 (backend/camada de dados) avançada, falta validação final completa
- [~] Fase 3 (banco/políticas) avançada, falta checagem final de políticas e índices
- [x] Fase 4 (gestão de usuários via admin) aplicada
- [x] Fase 5 (UX de status de assinatura) aplicada
- [~] Fase 6 (nomenclatura interna sem SaaS) parcial
- [~] Fase 7 (limpeza técnica/dívida) parcial
- [ ] Fase 8 (validação e rollout) pendente

## Bloco A - Testes Funcionais (P0)
- [ ] Login com usuário `active` e navegação completa (dashboard, eventos, clientes, relatórios)
- [ ] Login com usuário `trial` e validação de acesso equivalente ao plano vigente
- [ ] Login com usuário `suspended` e validação de bloqueios/avisos corretos
- [ ] Login com usuário `cancelled` e validação de bloqueios/avisos corretos
- [ ] Login com usuário `expired` e validação de bloqueios/avisos corretos
- [ ] Login com usuário sem assinatura (`sem_assinatura`) e validação de orientação para admin
- [ ] Criação de usuário no `/admin/users` com role `user` => plano automático `BASICO_MENSAL`
- [ ] Criação de usuário no `/admin/users` com role `admin` => plano automático `PREMIUM_MENSAL`
- [ ] Alteração manual de plano no admin e sincronização imediata do cache de assinatura do usuário
- [ ] Alteração manual de status no admin para usuário recém-criado sem erro 500

## Bloco B - Integridade de Dados (P0)
- [ ] Validar `empresa_id` preenchido nas tabelas de domínio (sem NULL)
- [ ] Validar defaults de `empresa_id` para novas inserções
- [ ] Validar filtros por `empresa_id` nas consultas críticas (clientes/eventos/pagamentos/custos/serviços/contratos)
- [ ] Validar `user_id` mantido como auditoria, sem uso de isolamento de tenant
- [ ] Validar consistência do campo de cache `user.assinatura` após operações de plano/status

## Bloco C - Segurança e Autorização (P0)
- [ ] Confirmar que criação de contas ocorre apenas via admin
- [ ] Confirmar que usuários comuns não conseguem elevar role para admin
- [ ] Validar acesso de admin e perfis premium às rotas administrativas permitidas
- [ ] Revisar e validar políticas RLS alinhadas ao modelo single-tenant

## Bloco D - Limpeza de Resíduos SaaS (P1)
- [ ] Revisar e remover nomenclaturas legadas de Hotmart quando não fizer mais sentido no domínio interno
- [ ] Revisar endpoints legados de webhook e manter somente comportamento desativado/documentado
- [ ] Revisar textos de UI com linguagem de auto contratação/upgrade e padronizar para fluxo interno (admin)
- [ ] Revisar logs e mensagens técnicas para remover ambiguidade entre CRM interno e SaaS

## Bloco E - Rollout e Operação (P0)
- [ ] Snapshot/backup antes da virada final (Supabase + Firestore)
- [ ] Aplicar migrações em homologação e executar checklist completo
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Smoke tests pós-deploy (admin, usuário ativo e usuário bloqueado)
- [ ] Monitorar erros por 24h (API 5xx, auth, assinatura, permissões)

## Bloco F - Rollback (P0)
- [ ] Definir gatilhos de rollback (ex.: erro crítico de acesso/assinatura em produção)
- [ ] Documentar sequência de rollback técnico (backend/frontend/migração)
- [ ] Definir responsáveis e janela de decisão

## Critério de Conclusão 100%
- Todos os itens P0 concluídos
- No máximo itens P1 sem impacto funcional imediato
- Sem erro crítico de autenticação/autorização/assinatura em produção
