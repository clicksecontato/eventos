import { expect, Page, test } from '@playwright/test';

export function credenciaisAdminDisponiveis(): boolean {
  return Boolean(process.env.E2E_ADMIN_EMAIL && process.env.E2E_ADMIN_PASSWORD);
}

export function pularSeSemCredenciaisAdmin() {
  test.skip(!credenciaisAdminDisponiveis(), 'Defina E2E_ADMIN_EMAIL e E2E_ADMIN_PASSWORD para executar este teste.');
}

export async function loginComoAdmin(page: Page) {
  const email = process.env.E2E_ADMIN_EMAIL!;
  const senha = process.env.E2E_ADMIN_PASSWORD!;

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Senha').fill(senha);
  await page.getByTestId('login-submit').click();

  await expect(page).toHaveURL(/\/painel|\/dashboard|\/eventos|\/admin/, { timeout: 30000 });
  await expect(page.getByText('Email ou senha inválidos')).toHaveCount(0);
}
