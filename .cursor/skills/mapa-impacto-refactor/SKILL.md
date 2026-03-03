---
name: mapa-impacto-refactor
description: Mapeia impacto de refatorações por termo antigo/novo, prioriza risco por camada e define ordem segura de alteração. Use quando houver renomeações amplas, migrações de nomenclatura, ou necessidade de levantar arquivos afetados antes de codar.
---

# Mapa de Impacto de Refactor

## Objetivo
Criar um mapa de impacto prático para refatorações amplas (ex.: `tipo_servicos` -> `servicos`) sem quebrar produção.

## Checklist rápido
- Definir par de termos: antigo e novo.
- Levantar ocorrências em `src/`, `supabase/`, `scripts/`.
- Classificar por camada: banco, repositório, serviço, API, UI.
- Marcar risco: alto, médio, baixo.
- Propor ordem de execução e fallback de compatibilidade.

## Passo a passo
1. **Buscar ocorrências**
   - Usar busca por termos exatos e variantes (`snake_case`, `camelCase`, labels).
2. **Agrupar por criticidade**
   - **Alto:** schema/migrations, joins, FKs, payload API público.
   - **Médio:** serviços/repositórios internos.
   - **Baixo:** textos de UI, labels, comentários.
3. **Definir estratégia de transição**
   - Manter dual-write e dual-read quando necessário.
   - Adiar remoção de legado para etapa final.
4. **Ordenar execução**
   - Banco -> Repositórios -> Serviços/APIs -> UI -> Limpeza.
5. **Entregar mapa**
   - Lista de arquivos por etapa + riscos + validação.

## Formato de saída
Usar esta estrutura:

```markdown
## Impacto do Refactor <antigo -> novo>

- Escopo: <resumo curto>
- Risco geral: <alto/médio/baixo>

### Etapa 1 — Banco (alto)
- `supabase/...`
- risco: ...
- validação: ...

### Etapa 2 — Backend (médio)
- `src/lib/...`
- risco: ...
- validação: ...

### Etapa 3 — Frontend (baixo)
- `src/components/...`
- risco: ...
- validação: ...
```

## Critérios de pronto
- Ordem de execução explícita.
- Compatibilidade temporária documentada.
- Plano de verificação pós-mudança incluído.
