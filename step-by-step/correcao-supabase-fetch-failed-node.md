# Correção — `TypeError: fetch failed` ao chamar o Supabase (Node / WSL2)

## Sintoma

APIs que usam `@supabase/supabase-js` no servidor retornam 500 com mensagem do tipo:
`Erro ao buscar ...: TypeError: fetch failed`.

## Causa comum

No **WSL2** e em alguns ambientes **Node**, a resolução DNS devolve **IPv6** primeiro; a rota até o host do Supabase falha e o `fetch` nativo encerra com `fetch failed` (sem detalhe útil).

## O que foi alterado no código

Em `src/lib/supabase/client.ts`, antes de criar os clientes, o servidor Node chama:

`require('node:dns').setDefaultResultOrder('ipv4first')`

Isso prioriza **IPv4** nas conexões seguintes. Pode ser desativado com:

`SUPABASE_DNS_IPV4_FIRST=false` ou `SUPABASE_DNS_IPV4_FIRST=0`

## Se ainda falhar

1. Confirmar `NEXT_PUBLIC_SUPABASE_URL` (https://…supabase.co), chaves e projeto **ativo** no painel Supabase.
2. Testar no host: `curl -I "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/"` (com header `apikey` se necessário).
3. Ajustar DNS no WSL (`/etc/resolv.conf`) ou usar rede estável / VPN desligada para teste.
