import { expect, test } from '@playwright/test';
import { legalAcceptance } from '../src/features/legal/constants';
import type { Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('vault-cookie-consent', JSON.stringify({ choice: 'rejected', version: '2026-10-10' })));
});

const apiBase = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1';
test.use({ baseURL: process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173' });
const previewKey = 'vault-preview-session';
const banner = (page: Page) => page.getByRole('region', { name: 'Demonstração do Vault' });

async function session(page: Page) {
  return page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)!) as {
    access_token: string; expires_at: string; user: { id: string; name: string }
  }, previewKey);
}

test('login oferece link no canto superior direito para explorar sem preencher credenciais', async ({ page }) => {
  await page.goto('/login');
  const link = page.getByRole('link', { name: 'Explorar demonstração' });
  await expect(link).toHaveAttribute('href', '/preview');
  await expect(link).toBeVisible();
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Senha', { exact: false })).toHaveValue('');
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const bounds = await link.boundingBox();
    const logo = await page.locator('.auth-brand .brand-mark').boundingBox();
    expect(bounds).not.toBeNull();
    expect(logo).not.toBeNull();
    expect(bounds!.y).toBeLessThan(80);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.x > logo!.x + logo!.width || bounds!.y + bounds!.height <= logo!.y).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await link.focus();
  await expect(link).toBeFocused();
  await link.press('Enter');
  await expect(page).toHaveURL(/\/preview$/);
  await expect(banner(page)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fintrack-token'))).toBeNull();
});

test('preview público navega pelas telas reais, mantém deep links e recarga sem login', async ({ page }) => {
  const bootstrapHeaders: (string | undefined)[] = [];
  let bootstraps = 0;
  const authRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (request.url().endsWith('/preview/session')) {
      bootstraps++;
      bootstrapHeaders.push(request.headers().authorization);
    }
    if (/\/auth\/(login|register)$/.test(request.url())) authRequests.push(request.url());
  });
  await page.goto('/preview');
  await expect(banner(page)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Visão geral', exact: true })).toBeVisible();
  const first = await session(page);
  expect(bootstraps).toBe(1); // StrictMode must not create two synthetic users.
  expect(bootstrapHeaders).toEqual([undefined]);
  expect(authRequests).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('fintrack-token'))).toBeNull();
  for (const link of await page.locator('.sidebar a').all()) {
    expect(await link.getAttribute('href')).toMatch(/^\/preview(?:$|\/)/);
  }
  await page.getByRole('button', { name: 'Ver todas' }).click();
  await expect(page).toHaveURL(/\/preview\/transactions$/);
  for (const [label, path] of [
    ['Gastos fixos', 'fixed-expenses'], ['Limites', 'limits'], ['Metas', 'goals'],
    ['Categorias', 'categories'], ['Relatórios', 'reports'], ['Configurações', 'settings']
  ]) {
    await page.locator('.primary-nav').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/preview/${path}$`));
    await expect(banner(page)).toBeVisible();
  }
  await expect(page.getByRole('note')).toContainText('somente para leitura');
  await expect(page.getByLabel('Nome', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled();
  await page.getByLabel('Buscar transações').fill('mercado');
  await page.getByLabel('Buscar transações').press('Enter');
  await expect(page).toHaveURL(/\/preview\/transactions\?q=mercado$/);
  await page.reload();
  await expect(banner(page)).toBeVisible();
  await expect(page.getByLabel('Buscar por descrição')).toHaveValue('mercado');
  expect((await session(page)).access_token).toBe(first.access_token);
  expect(bootstraps).toBe(1);
  expect(errors).toEqual([]);
});

test('CRUD de categoria e transação no preview usa API real e restaura dados isolados', async ({ page, request }) => {
  test.setTimeout(90_000);
  await page.goto('/preview/categories');
  await expect(banner(page)).toBeVisible();
  const original = await session(page);
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Compras Preview QA');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Compras Preview QA', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Compras Preview QA' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Compras Preview Editada');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByText('Compras Preview Editada', { exact: true })).toBeVisible();
  await page.locator('.primary-nav').getByRole('link', { name: 'Transações', exact: true }).click();
  await page.getByRole('button', { name: 'Nova transação' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Descrição').fill('Transação Preview QA');
  await dialog.getByLabel('Valor', { exact: true }).fill('149.90');
  await dialog.getByRole('combobox', { name: 'Categoria', exact: true }).selectOption({ label: 'Compras Preview Editada' });
  await dialog.getByRole('button', { name: 'Salvar transação' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByLabel('Buscar por descrição').fill('Transação Preview QA');
  const row = page.locator('.feature-row').filter({ hasText: 'Transação Preview QA' });
  await expect(row).toContainText('149,90');
  await page.getByRole('button', { name: 'Editar Transação Preview QA' }).click();
  await dialog.getByLabel('Valor', { exact: true }).fill('159.90');
  await dialog.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(dialog).not.toBeVisible();
  await expect(row).toContainText('159,90');
  const headers = { Authorization: `Bearer ${original.access_token}` };
  const persisted = await request.get(`${apiBase}/transactions?q=Transação%20Preview%20QA`, { headers });
  expect(persisted.status()).toBe(200);
  const items = (await persisted.json()).items as { id: string; amount: number }[];
  expect(items).toHaveLength(1);
  expect(Number(items[0].amount)).toBe(159.9);
  page.once('dialog', (confirm) => confirm.accept());
  await page.getByRole('button', { name: 'Excluir Transação Preview QA' }).click();
  await expect(row).toHaveCount(0);
  await page.locator('.primary-nav').getByRole('link', { name: 'Categorias', exact: true }).click();
  page.once('dialog', (confirm) => confirm.accept());
  await page.getByRole('button', { name: 'Excluir Compras Preview Editada' }).click();
  await expect(page.getByText('Compras Preview Editada', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Descartada ao restaurar');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Descartada ao restaurar', { exact: true })).toBeVisible();
  page.once('dialog', (confirm) => confirm.accept());
  await banner(page).getByRole('button', { name: 'Restaurar demo' }).click();
  await expect(banner(page)).toBeVisible();
  await expect(page.getByText('Descartada ao restaurar', { exact: true })).toHaveCount(0);
  expect((await session(page)).user.id).not.toBe(original.user.id);
});

test('preview permite gastos fixos, limites e metas de poupança pela API real', async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto('/preview/categories');
  await expect(banner(page)).toBeVisible();
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Planos Preview QA');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Planos Preview QA', { exact: true })).toBeVisible();
  await page.locator('.primary-nav').getByRole('link', { name: 'Gastos fixos' }).click();
  await page.getByRole('button', { name: 'Novo gasto fixo' }).click();
  const form = page.locator('.inline-form');
  await form.getByLabel('Descrição').fill('Assinatura Preview QA');
  await form.getByLabel('Valor', { exact: true }).fill('25');
  await form.getByLabel('Categoria').selectOption({ label: 'Planos Preview QA' });
  await form.getByRole('button', { name: 'Salvar', exact: true }).click();
  const fixed = page.locator('.record-list article').filter({ hasText: 'Assinatura Preview QA' });
  await expect(fixed).toContainText('Ativo');
  await page.getByRole('button', { name: 'Editar Assinatura Preview QA' }).click();
  await form.getByLabel('Valor', { exact: true }).fill('30');
  await form.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(fixed).toContainText('30,00');
  page.once('dialog', (confirm) => confirm.accept());
  await page.getByRole('button', { name: 'Desativar Assinatura Preview QA' }).click();
  await expect(fixed).toContainText('Inativo');
  page.once('dialog', (confirm) => confirm.accept());
  await page.getByRole('button', { name: 'Reativar Assinatura Preview QA' }).click();
  await expect(fixed).toContainText('Ativo');
  await page.locator('.primary-nav').getByRole('link', { name: 'Limites', exact: true }).click();
  await page.getByRole('button', { name: 'Novo limite' }).click();
  await form.getByLabel('Categoria').selectOption({ label: 'Planos Preview QA' });
  await form.getByLabel('Limite mensal').fill('100');
  await form.getByRole('button', { name: 'Salvar', exact: true }).click();
  const limit = page.locator('.goal-board article').filter({ hasText: 'Planos Preview QA' });
  await expect(limit).toContainText('100,00');
  await page.getByRole('button', { name: 'Editar limite de Planos Preview QA' }).click();
  await form.getByLabel('Limite mensal').fill('200');
  await form.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(limit).toContainText('200,00');
  page.once('dialog', (confirm) => confirm.accept());
  await page.getByRole('button', { name: 'Excluir limite de Planos Preview QA' }).click();
  await expect(limit).toHaveCount(0);
  await page.locator('.primary-nav').getByRole('link', { name: 'Metas', exact: true }).click();
  await page.getByRole('button', { name: 'Nova meta' }).click();
  await form.getByLabel('Nome da meta').fill('Viagem Preview QA');
  await form.getByLabel('Valor desejado').fill('100');
  await form.getByRole('button', { name: 'Criar meta' }).click();
  const goal = page.locator('.savings-card').filter({ hasText: 'Viagem Preview QA' });
  await expect(goal).toBeVisible();
  await goal.getByRole('button', { name: 'Adicionar dinheiro' }).click();
  await goal.getByLabel('Valor para guardar').fill('10');
  await goal.getByRole('button', { name: 'Confirmar aporte' }).click();
  await expect(goal).toContainText('10% da meta alcançada');
  page.once('dialog', (confirm) => confirm.accept());
  await goal.getByRole('button', { name: 'Cancelar meta' }).click();
  await expect(goal).toHaveCount(0);
});

test('conta real e preview isolam tokens, perfil, preferências, dados e cache', async ({ page, request }) => {
  test.setTimeout(90_000);
  let bootstraps = 0;
  page.on('request', (request) => { if (request.url().endsWith('/preview/session')) bootstraps++; });
  const email = `preview-isolation-${Date.now()}@example.com`;
  const password = 'senha-qa-preview-123';
  expect((await request.post(`${apiBase}/auth/register`, { data: { ...legalAcceptance, name: 'Conta Real QA', email, password, default_currency: 'BRL' } })).status()).toBe(201);
  const login = await request.post(`${apiBase}/auth/login`, { data: { ...legalAcceptance, email, password } });
  expect(login.status()).toBe(200);
  const accountToken = (await login.json()).access_token as string;
  const headers = { Authorization: `Bearer ${accountToken}` };
  const profile = await (await request.get(`${apiBase}/auth/me`, { headers })).json();
  const category = await request.post(`${apiBase}/categories`, { headers, data: { name: 'Somente Conta Real', type: 'expense', icon: 'tag', color: '#123456' } });
  expect(category.status()).toBe(201);
  const categoryId = (await category.json()).id as string;
  const accountData = await (await request.get(`${apiBase}/categories`, { headers })).json();
  await page.addInitScript(({ token, user }) => {
    if (!localStorage.getItem('fintrack-token')) {
      localStorage.setItem('fintrack-token', token);
      localStorage.setItem('vault-user', JSON.stringify(user));
      localStorage.setItem('vault-theme', 'light');
    }
  }, { token: accountToken, user: profile });
  try {
    await page.goto('/categories');
    await expect(page.getByText('Somente Conta Real', { exact: true })).toBeVisible();
    const before = await page.evaluate(() => ({ ...localStorage }));
    // Push a SPA route to exercise an already populated account QueryClient.
    await page.evaluate(() => { window.history.pushState({}, '', '/preview/categories'); window.dispatchEvent(new PopStateEvent('popstate')); });
    await expect(banner(page)).toBeVisible();
    expect(bootstraps).toBe(1);
    await expect(page.getByText('Somente Conta Real', { exact: true })).toHaveCount(0);
    expect((await session(page)).access_token).not.toBe(accountToken);
    await page.getByRole('button', { name: 'Nova categoria' }).click();
    await page.getByLabel('Nome', { exact: true }).fill('Somente Preview');
    await page.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.getByText('Somente Preview', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Ativar modo escuro' }).click();
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    await banner(page).getByRole('link', { name: 'Ir para minha conta' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.account-copy')).toContainText('Conta Real QA');
    await page.locator('.primary-nav').getByRole('link', { name: 'Categorias', exact: true }).click();
    await expect(page.getByText('Somente Conta Real', { exact: true })).toBeVisible();
    await expect(page.getByText('Somente Preview', { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => ({ ...localStorage }))).toEqual(before);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), previewKey)).toBeNull();
    expect(bootstraps).toBe(1); // Leaving must not silently create another demo.
    const after = await (await request.get(`${apiBase}/categories`, { headers })).json();
    expect(after).toEqual(accountData);
  } finally {
    await request.delete(`${apiBase}/categories/${categoryId}`, { headers });
  }
});

test('preview expirado em reload exige reinício explícito e preserva a sessão real', async ({ page, request }) => {
  const created = await request.post(`${apiBase}/preview/session`);
  expect(created.status()).toBe(201);
  const data = await created.json();
  let bootstraps = 0;
  page.on('request', (request) => { if (request.url().endsWith('/preview/session')) bootstraps++; });
  await page.addInitScript(({ key, value }) => {
    if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify({ ...value, expires_at: new Date(0).toISOString() }));
    localStorage.setItem('fintrack-token', 'preserve-existing-session');
    localStorage.setItem('vault-user', '{"name":"Pessoa real","email":"real@example.com","default_currency":"USD"}');
  }, { key: previewKey, value: data });
  await page.goto('/preview/transactions');
  await expect(page.getByRole('heading', { name: 'A demonstração expirou' })).toBeVisible();
  expect(bootstraps).toBe(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A demonstração expirou' })).toBeVisible();
  expect(bootstraps).toBe(0);
  await page.getByRole('button', { name: 'Reiniciar demonstração' }).click();
  await expect(banner(page)).toBeVisible();
  await expect(page).toHaveURL(/\/preview\/transactions$/);
  expect((await session(page)).user.id).not.toBe(data.user.id);
  expect(await page.evaluate(() => localStorage.getItem('fintrack-token'))).toBe('preserve-existing-session');
});

test('401 do preview mostra expiração sem apagar login real e falha de bootstrap permite retry', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fintrack-token', 'account-token-untouched'));
  // Only the bootstrap failure is simulated; the subsequent session and CRUD use the real API.
  await page.route('**/preview/session', (route) => route.fulfill({ status: 503, json: { detail: 'unavailable' } }), { times: 1 });
  await page.goto('/preview');
  await expect(page.getByRole('heading', { name: 'Demonstração indisponível' })).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(banner(page)).toBeVisible();
  await page.route('**/categories', (route) => route.fulfill({ status: 401, json: { detail: 'expired' } }));
  await page.locator('.primary-nav').getByRole('link', { name: 'Categorias', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A demonstração expirou' })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fintrack-token'))).toBe('account-token-untouched');
});

test('preview mobile mantém navegação prefixada e banner sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/preview/transactions');
  await expect(banner(page)).toBeVisible();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.locator('.primary-nav').getByRole('link', { name: 'Metas', exact: true }).click();
  await expect(page).toHaveURL(/\/preview\/goals$/);
  await expect(page.getByRole('heading', { name: 'Metas', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await banner(page).getByRole('link', { name: 'Sair da demonstração' }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(await page.evaluate((key) => sessionStorage.getItem(key), previewKey)).toBeNull();
});

test('expiração durante uso exige reinício e preserva conta e deep link', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => localStorage.setItem('fintrack-token', 'account-session-preserved'));
  await page.goto('/preview/transactions');
  await expect(banner(page)).toBeVisible();
  const first = await session(page);
  await page.clock.fastForward(Math.max(0, Date.parse(first.expires_at) - Date.now()) + 1000);
  await expect(page.getByRole('heading', { name: 'A demonstração expirou' })).toBeVisible();
  // Return to the API's real clock before creating another genuine session.
  await page.clock.setSystemTime(new Date());
  await page.getByRole('button', { name: 'Reiniciar demonstração' }).click();
  await expect(banner(page)).toBeVisible();
  await expect(page).toHaveURL(/\/preview\/transactions$/);
  expect((await session(page)).access_token).not.toBe(first.access_token);
  expect(await page.evaluate(() => localStorage.getItem('fintrack-token'))).toBe('account-session-preserved');
});
