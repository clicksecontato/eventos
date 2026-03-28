# Contratos: `confirm` → `ConfirmationDialog`

Substituição de `window.confirm` pelo componente padrão do projeto (`src/components/ui/confirmation-dialog.tsx`, Radix Dialog).

## Arquivos

- `src/components/contratos/ContratoPartesPanel.tsx` — exclusão de parte e de signatário (variante `destructive`).
- `src/app/contratos/[id]/page.tsx` — sair da aba Editar com rascunho não salvo, cancelar edição (descartar), revogar links de assinatura (`destructive`).

## Comportamento

- **Mudar de aba** com alterações na edição: diálogo “Alterações não salvas”; confirmar aplica `setAbaAtiva(destino)` sem descartar o texto (rascunho permanece ao voltar em Editar).
- **Cancelar** na edição com alterações: “Descartar alterações?”; confirmar restaura `conteudoEditado` a partir de `conteudoHtml` e vai para Visualizar.
- **Revogar links**: confirmação antes de chamar a API existente.
