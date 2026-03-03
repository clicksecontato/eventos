import { expect, test } from '@playwright/test';
import { loginComoAdmin, pularSeSemCredenciaisAdmin } from './helpers/auth';

test.describe('Autenticacao', () => {
  test('admin consegue autenticar e acessar painel', async ({ page }) => {
    pularSeSemCredenciaisAdmin();
    await loginComoAdmin(page);
    await expect(page).toHaveURL(/\/painel|\/dashboard|\/eventos|\/admin/);
  });
});
