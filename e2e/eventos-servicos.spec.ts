import { expect, Page, test } from '@playwright/test';
import { loginComoAdmin, pularSeSemCredenciaisAdmin } from './helpers/auth';

function dataFuturaISO(dias: number): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

async function selecionarOuCriarTipoEvento(page: Page, nomeTipo: string) {
  const container = page.locator('div', {
    has: page.locator('label', { hasText: 'Tipo de Evento' }),
  }).first();

  await container.getByRole('button').click();
  await page.getByPlaceholder('Buscar...').fill(nomeTipo);

  const opcaoCriar = page.getByText(`Criar "${nomeTipo}"`);
  if (await opcaoCriar.count()) {
    await opcaoCriar.first().click();
    return;
  }

  await page.getByText(nomeTipo, { exact: true }).first().click();
}

test.describe('Eventos e Servicos', () => {
  test('cria evento manual e adiciona servico no detalhe', async ({ page }) => {
    pularSeSemCredenciaisAdmin();
    await loginComoAdmin(page);

    const sufixo = Date.now();
    const tipoEventoNome = `E2E Tipo ${sufixo}`;
    const clienteNome = `Cliente E2E ${sufixo}`;
    const servicoNome = `Servico E2E ${sufixo}`;

    await page.goto('/eventos/novo');
    await expect(page.getByRole('heading', { name: 'Novo Evento' })).toBeVisible();

    await page.getByRole('button', { name: 'Novo Cliente' }).click();
    await page.getByLabel('Nome *').fill(clienteNome);
    await page.getByLabel('Email *').fill(`cliente.e2e.${sufixo}@example.com`);
    await page.getByLabel('Telefone *').fill('11999999999');

    await page.getByLabel('Data do Evento *').fill(dataFuturaISO(15));
    await selecionarOuCriarTipoEvento(page, tipoEventoNome);
    await page.getByLabel('Local *').fill('Espaco E2E');
    await page.getByLabel('Endereço *').fill('Rua Teste E2E, 123');
    await page.getByLabel('Nome do Contratante *').fill(clienteNome);
    await page.getByLabel('Número de Convidados *').fill('100');

    await page.getByLabel('Modo do valor total').click();
    await page.getByRole('option', { name: 'Manual (valor negociado)' }).click();
    await page.getByLabel('Valor Total *').fill('750');
    await page.getByLabel('Dia Final de Pagamento *').fill(dataFuturaISO(30));

    await page.getByTestId('evento-submit').click();

    await expect(page).toHaveURL(/\/eventos\/[^/]+$/, { timeout: 30000 });
    await expect(page.getByRole('heading', { name: 'Resumo Financeiro' })).toBeVisible();

    await page.getByTestId('servicos-novo').click();
    await expect(page.getByRole('heading', { name: 'Adicionar Serviços' })).toBeVisible();

    await page.getByPlaceholder('Digite o nome do novo serviço').fill(servicoNome);
    await page.getByRole('button', { name: 'Criar' }).click();
    await page.locator('label', { hasText: servicoNome }).locator('input[type="checkbox"]').check();
    await page.getByTestId('servicos-modal-salvar').click();

    await expect(page.getByText(servicoNome)).toBeVisible({ timeout: 20000 });
  });
});
