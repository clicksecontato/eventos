# E2E (Playwright)

## Pré-requisitos
- Definir variáveis de ambiente:
  - `E2E_BASE_URL` (ex: `https://eventos-rho-three.vercel.app`)
  - `E2E_ADMIN_EMAIL`
  - `E2E_ADMIN_PASSWORD`
- Opcional para rodar local:
  - `E2E_USE_LOCAL=true`

## Execução
- Instalar navegadores (primeira vez):
  - `npx playwright install chromium`
- Rodar suite:
  - `npm run e2e`
- Rodar com UI:
  - `npm run e2e:ui`
- Abrir relatório HTML:
  - `npm run e2e:report`

## Cenários cobertos
- Login de admin.
- Criação de usuário em `/admin/users`.
- Criação de evento e adição de serviço no detalhe do evento.
