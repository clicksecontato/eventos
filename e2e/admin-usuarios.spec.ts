import { expect, test } from '@playwright/test';
import { loginComoAdmin, pularSeSemCredenciaisAdmin } from './helpers/auth';

test.describe('Admin Usuarios', () => {
  test('admin cria novo usuario pelo painel', async ({ page }) => {
    pularSeSemCredenciaisAdmin();
    await loginComoAdmin(page);

    const sufixo = Date.now();
    const email = `e2e.usuario.${sufixo}@example.com`;

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Administração de Usuários' })).toBeVisible();

    await page.getByLabel('Nome').fill(`E2E Usuario ${sufixo}`);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Senha').fill(`Senha!${sufixo}`);
    await page.getByTestId('admin-criar-usuario').click();

    await expect(page.getByText('Último usuário criado:')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(email)).toBeVisible();
  });
});
