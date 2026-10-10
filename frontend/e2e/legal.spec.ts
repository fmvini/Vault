import { expect, test } from '@playwright/test';
import { LEGAL_VERSION, SUPPORT_EMAIL } from '../src/features/legal/constants';

test.use({ baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173' });

for (const mode of ['login', 'register']) {
  test(mode + ' exige os dois aceites e envia a versão vigente', async ({ page }) => {
    const submissions: Record<string, unknown>[] = [];
    await page.route('**/auth/' + mode, async (route) => {
      submissions.push(route.request().postDataJSON());
      await route.fulfill({ status: 400, json: { detail: 'Resposta controlada para validação' } });
    });
    await page.goto('/' + mode);
    await page.getByRole('button', { name: 'Rejeitar opcionais' }).click();
    if (mode === 'register') await page.getByLabel('Nome', { exact: true }).fill('Pessoa Teste');
    await page.getByLabel('E-mail').fill('pessoa@example.com');
    await page.getByLabel('Senha').fill('senha-segura-123');
    const terms = page.getByRole('checkbox', { name: /Li e aceito os Termos/ });
    const privacy = page.getByRole('checkbox', { name: /Li e aceito a Política/ });
    await expect(terms).not.toBeChecked();
    await expect(privacy).not.toBeChecked();
    const submit = page.getByRole('button', { name: mode === 'register' ? 'Criar conta' : 'Entrar', exact: true });
    await submit.click();
    await expect(page.getByText('Aceite os Termos de Uso para continuar.')).toBeVisible();
    await expect(page.getByText('Aceite a Política de Privacidade para continuar.')).toBeVisible();
    expect(submissions).toHaveLength(0);
    await terms.check();
    await submit.click();
    await expect(page.getByText('Aceite a Política de Privacidade para continuar.')).toBeVisible();
    expect(submissions).toHaveLength(0);
    await privacy.check();
    await submit.click();
    await expect(page.getByText('Resposta controlada para validação')).toBeVisible();
    expect(submissions).toHaveLength(1);
    expect(submissions[0]).toMatchObject({ terms_accepted: true, privacy_accepted: true, legal_version: LEGAL_VERSION });
    await expect(page).toHaveURL(new RegExp('/' + mode + '$'));
    await expect(page.locator('.legal-checkbox a').first()).toHaveAttribute('target', '_blank');
  });
}

for (const choice of ['accepted', 'rejected']) {
  test('cookies: ' + choice + ' persiste e pode ser alterado em mobile e tema escuro', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => localStorage.setItem('vault-theme', 'dark'));
    await page.goto('/login');
    const dialog = page.getByRole('dialog', { name: 'Você escolhe o que fica no navegador' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('pequenos arquivos');
    await dialog.getByRole('button', { name: choice === 'accepted' ? 'Aceitar opcionais' : 'Rejeitar opcionais' }).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vault-cookie-consent') || 'null').choice)).toBe(choice);
    await page.reload();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Preferências de cookies', exact: true }).click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toBeFocused();
    await dialog.getByRole('button', { name: choice === 'accepted' ? 'Rejeitar opcionais' : 'Aceitar opcionais' }).click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('vault-cookie-consent') || 'null').choice)).not.toBe(choice);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('preferência inválida ou de versão antiga reabre o aviso', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vault-cookie-consent', JSON.stringify({ choice: 'accepted', version: '2020-01-01' })));
  await page.goto('/politica-de-cookies');
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('documentos são públicos e suporte apresenta o e-mail solicitado', async ({ page }) => {
  for (const [route, title] of [['termos-de-uso', 'Termos de Uso'], ['politica-de-privacidade', 'Política de Privacidade'], ['politica-de-cookies', 'Política de Cookies']]) {
    await page.goto('/' + route);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
    await expect(page.getByRole('link', { name: SUPPORT_EMAIL, exact: true })).toHaveAttribute('href', 'mailto:' + SUPPORT_EMAIL);
  }
  expect(await page.evaluate(() => localStorage.getItem('fintrack-token'))).toBeNull();
});

for (const route of ['/pagina-inexistente', '/preview/pagina-inexistente']) {
  test('404 preserva o endereço e oferece recuperação em ' + route, async ({ page }) => {
    await page.goto(route);
    await page.getByRole('button', { name: 'Rejeitar opcionais' }).click();
    await expect(page.getByRole('heading', { name: 'Esta página ficou fora do planejamento.' })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(route + '$'));
    await expect(page.getByRole('link', { name: route.startsWith('/preview') ? 'Voltar à demonstração' : 'Ir para o login' })).toHaveAttribute('href', route.startsWith('/preview') ? '/preview' : '/login');
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
