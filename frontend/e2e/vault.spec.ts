import { expect, test } from '@playwright/test';

test('fluxo principal persiste dados e funciona em desktop e mobile', async ({ page }) => {
  const suffix = Date.now();
  const email = `qa-${suffix}@example.com`;
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  await page.goto('/transactions');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/register');
  await expect(page.locator('.auth-brand img')).toHaveAttribute('src', '/vault-icon-dark.svg');
  await page.getByLabel('Nome').fill('QA Vault');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-segura-123');
  await page.getByRole('button', { name: 'Criar conta' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();

  await expect(page.locator('.brand-mark-light')).toHaveCSS('opacity', '1');
  await expect(page.locator('.brand-mark-dark')).toHaveCSS('opacity', '0');
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click();
  await expect(page.locator('.brand-mark-light')).toHaveCSS('opacity', '0');
  await expect(page.locator('.brand-mark-dark')).toHaveCSS('opacity', '1');
  await expect(page.locator('#app-favicon')).toHaveAttribute('href', '/vault-icon-dark.svg');
  await page.screenshot({ path: '../test-results/dashboard-logo-dark.png', fullPage: true });
  await page.getByRole('button', { name: 'Ativar modo claro' }).click();
  await expect(page.locator('#app-favicon')).toHaveAttribute('href', '/vault-icon.svg');

  await page.getByRole('link', { name: 'Categorias' }).click();
  const systemCategory = page.locator('.category-columns article').filter({ hasText: 'Categoria do sistema' }).first();
  await expect(systemCategory).toContainText('Protegida');
  await expect(systemCategory.locator('.row-actions')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova categoria' }).click();
  await page.getByLabel('Nome').fill('Compras QA');
  await page.getByLabel('Ícone').selectOption('food');
  await page.getByLabel('Cor').fill('#123456');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByText('Compras QA')).toBeVisible();
  const customCategory = page.locator('.category-columns article').filter({ hasText: 'Compras QA' });
  await expect(customCategory.locator('svg.lucide-utensils')).toBeVisible();
  await expect(customCategory.locator('.category-swatch')).toHaveCSS('background-color', 'rgb(18, 52, 86)');

  await page.getByRole('link', { name: 'Gastos fixos' }).click();
  await page.getByRole('button', { name: 'Novo gasto fixo' }).click();
  const fixedForm = page.locator('.inline-form');
  await fixedForm.getByLabel('Descrição').fill('Assinatura QA');
  await fixedForm.getByLabel('Valor').fill('25');
  await fixedForm.getByLabel('Categoria').selectOption({ label: 'Compras QA' });
  await fixedForm.getByRole('button', { name: 'Salvar', exact: true }).click();
  const fixedRow = page.locator('.record-list article').filter({ hasText: 'Assinatura QA' });
  await expect(fixedRow).toContainText('Ativo');
  await page.getByRole('button', { name: 'Editar Assinatura QA' }).click();
  await fixedForm.getByLabel('Valor').fill('30');
  await fixedForm.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(fixedRow).toContainText('30,00');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Desativar Assinatura QA' }).click();
  await expect(fixedRow).toContainText('Inativo');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reativar Assinatura QA' }).click();
  await expect(fixedRow).toContainText('Ativo');

  await page.getByRole('link', { name: 'Metas' }).click();
  await page.getByRole('button', { name: 'Nova meta' }).click();
  const goalForm = page.locator('.inline-form');
  await goalForm.getByLabel('Categoria').selectOption({ label: 'Compras QA' });
  await goalForm.getByLabel('Limite mensal').fill('100');
  await goalForm.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('.goal-board article').filter({ hasText: 'Compras QA' })).toContainText('Dentro do planejado');

  await page.getByRole('link', { name: 'Transações' }).click();
  await page.getByRole('button', { name: 'Nova transação' }).click();
  const transactionDialog = page.getByRole('dialog');
  await transactionDialog.getByRole('button', { name: 'Salvar transação' }).click();
  await expect(transactionDialog.getByText('Informe um valor maior que zero')).toBeVisible();
  await transactionDialog.getByRole('textbox', { name: 'Descrição' }).fill('Mercado QA');
  await transactionDialog.getByRole('spinbutton', { name: 'Valor' }).fill('149.90');
  await expect(transactionDialog.getByRole('combobox', { name: 'Moeda' }).locator('option')).toHaveText(['BRL', 'USD', 'EUR']);
  await transactionDialog.getByRole('combobox', { name: 'Moeda' }).selectOption('BRL');
  await transactionDialog.getByRole('combobox', { name: 'Categoria' }).selectOption('');
  await transactionDialog.getByRole('button', { name: 'Salvar transação' }).click();
  await expect(transactionDialog.getByText('Selecione uma categoria')).toBeVisible();
  await transactionDialog.getByRole('combobox', { name: 'Categoria' }).selectOption({ label: 'Compras QA' });
  await page.getByRole('button', { name: 'Salvar transação' }).click();
  await expect(page.getByText('Mercado QA')).toBeVisible();
  await page.getByRole('button', { name: 'Editar Mercado QA' }).click();
  await page.getByRole('dialog').getByRole('spinbutton', { name: 'Valor' }).fill('159.90');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.locator('.feature-row').filter({ hasText: 'Mercado QA' })).toContainText('159,90');
  await page.getByPlaceholder('Buscar por descrição').fill('Mercado');
  await expect(page.getByText('Mercado QA')).toBeVisible();

  await page.getByRole('link', { name: 'Visão geral' }).click();
  await expect(page.locator('.money-summary.rose strong')).toContainText('159,90');
  await page.locator('.period-controls select').selectOption('three-months');
  await expect(page.locator('.period-controls small')).toHaveText('Últimos 3 meses');
  await expect(page.getByText('1 meta(s) ultrapassada(s) neste mês.')).toBeVisible();
  await expect(page.locator('.goal-item').filter({ hasText: 'Compras QA' })).toContainText('160%');
  await page.screenshot({ path: '../test-results/dashboard-desktop.png', fullPage: true });

  await page.getByRole('link', { name: 'Metas' }).click();
  const goalCard = page.locator('.goal-board article').filter({ hasText: 'Compras QA' });
  await expect(goalCard).toHaveClass(/exceeded/);
  await expect(goalCard).toContainText('Limite ultrapassado');
  await page.getByRole('button', { name: 'Editar meta de Compras QA' }).click();
  await goalForm.getByLabel('Limite mensal').fill('200');
  await goalForm.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(goalCard).toContainText('Dentro do planejado');
  await page.getByRole('link', { name: 'Visão geral' }).click();
  await expect(page.getByText('0 meta(s) ultrapassada(s) neste mês.')).toBeVisible();
  await page.getByRole('link', { name: 'Metas' }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Excluir meta de Compras QA' }).click();
  await expect(page.locator('.goal-board article').filter({ hasText: 'Compras QA' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Visão geral' }).click();
  await expect(page.getByText('Sem metas ativas.')).toBeVisible();

  await page.getByRole('link', { name: 'Configurações' }).click();
  await page.getByLabel('Nome').fill('QA Vault Persistido');
  await page.locator('#currency select').selectOption('USD');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('button', { name: 'Alterações salvas' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Nome')).toHaveValue('QA Vault Persistido');
  await expect(page.locator('#currency select')).toHaveValue('USD');
  await page.locator('#currency select').selectOption('BRL');
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page.getByRole('button', { name: 'Alterações salvas' })).toBeVisible();
  await page.locator('summary[aria-label="Abrir menu da conta"]').click();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Senha').fill('senha-segura-123');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByText('QA Vault Persistido')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible();
  await page.getByRole('link', { name: 'Transações' }).click();
  await expect(page.getByText('Mercado QA')).toBeVisible();
  const mobileLayout = await page.evaluate(() => ({
    viewport: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    offenders: [...document.querySelectorAll<HTMLElement>('body *')]
      .map((element) => ({ element: element.tagName.toLowerCase(), className: element.className, right: Math.round(element.getBoundingClientRect().right), width: Math.round(element.getBoundingClientRect().width) }))
      .filter((item) => item.right > window.innerWidth + 1 && item.width > 0)
      .slice(0, 12)
  }));
  expect(mobileLayout.viewport).toBe(390);
  expect(mobileLayout.documentWidth).toBe(390);
  await page.screenshot({ path: '../test-results/transactions-mobile.png', fullPage: true, animations: 'disabled' });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Visão geral' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(768);
  await page.screenshot({ path: '../test-results/dashboard-tablet.png', fullPage: true, animations: 'disabled' });

  expect(consoleErrors).toEqual([]);
});

test('histórico pagina, combina filtros e ordena lançamentos', async ({ page, request }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1';
  const email = `historico-${Date.now()}@example.com`;
  const user = { name: 'QA Histórico', email, password: 'senha-segura-123', default_currency: 'BRL' };
  expect((await request.post(`${apiBase}/auth/register`, { data: user })).status()).toBe(201);
  const login = await request.post(`${apiBase}/auth/login`, { data: { email, password: user.password } });
  expect(login.status()).toBe(200);
  const token = (await login.json()).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };
  const categoriesResponse = await request.get(`${apiBase}/categories`, { headers });
  const categories = (await categoriesResponse.json() as { id: string; type: string }[]).filter((item) => item.type === 'expense');
  expect(categories.length).toBeGreaterThanOrEqual(2);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const iso = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  for (let index = 0; index < 12; index += 1) {
    const response = await request.post(`${apiBase}/transactions`, { headers, data: {
      category_id: categories[index % 2].id,
      type: 'expense', amount: index + 1, currency: 'BRL',
      description: `Lote QA ${String(index).padStart(2, '0')}`,
      transaction_date: iso(index < 6 ? yesterday : today)
    } });
    expect(response.status()).toBe(201);
  }
  await page.addInitScript((value) => localStorage.setItem('fintrack-token', value), token);
  await page.goto('/transactions');
  await expect(page.getByRole('heading', { name: 'Transações' })).toBeVisible();
  const rows = page.locator('.feature-row:not(.feature-row-head)');
  await expect(rows).toHaveCount(10);
  await page.getByRole('button', { name: 'Próxima página' }).click();
  await expect(rows).toHaveCount(2);
  await expect(page.getByText('Página 2 de 2')).toBeVisible();
  await page.getByRole('button', { name: 'Página anterior' }).click();
  await expect(rows).toHaveCount(10);

  const filters = page.locator('.filter-strip');
  await filters.locator('select').nth(2).selectOption('amount:asc');
  await expect(rows.first()).toContainText('Lote QA 00');
  await filters.locator('select').nth(2).selectOption('amount:desc');
  await expect(rows.first()).toContainText('Lote QA 11');
  await filters.locator('select').nth(2).selectOption('transaction_date:asc');
  await expect(rows.first()).toContainText(/Lote QA 0[0-5]/);
  await filters.locator('select').nth(2).selectOption('transaction_date:desc');
  await expect(rows.first()).toContainText(/Lote QA (0[6-9]|1[01])/);

  await filters.getByPlaceholder('Buscar por descrição').fill('Lote QA');
  await filters.locator('select').nth(0).selectOption('expense');
  await filters.locator('select').nth(1).selectOption(categories[1].id);
  await filters.locator('input[type="date"]').nth(0).fill(iso(yesterday));
  await filters.locator('input[type="date"]').nth(1).fill(iso(yesterday));
  await expect(rows).toHaveCount(3);
  await filters.locator('select').nth(0).selectOption('income');
  await expect(page.getByText('Nenhuma transação encontrada para estes filtros.')).toBeVisible();
  await filters.getByRole('button', { name: 'Limpar' }).click();
  await expect(rows).toHaveCount(10);
  await filters.getByRole('button', { name: 'Último mês' }).click();
  await expect(page.getByText('Nenhuma transação encontrada para estes filtros.')).toBeVisible();

  await page.getByRole('link', { name: 'Visão geral' }).click();
  await page.locator('.period-controls select').selectOption('custom');
  await page.getByLabel('Data inicial').fill(iso(yesterday));
  await page.getByLabel('Data final').fill(iso(today));
  await expect(page.locator('.money-summary.rose strong')).toContainText('78,00');
  await expect(page.locator('.category-list li')).toHaveCount(2);
  await expect(page.locator('.recharts-xAxis .recharts-cartesian-axis-tick')).toHaveCount(2);
});

test('status de recorrência alterna entre pendente e pago na interface', async ({ page, request }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1';
  const email = `recorrencia-ui-${Date.now()}@example.com`;
  const password = 'senha-segura-123';
  expect((await request.post(`${apiBase}/auth/register`, { data: {
    name: 'QA Recorrência', email, password, default_currency: 'BRL'
  } })).status()).toBe(201);
  const login = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  const token = (await login.json()).access_token as string;
  const categories = await request.get(`${apiBase}/categories`, { headers: { Authorization: `Bearer ${token}` } });
  const category = (await categories.json() as { id: string; name: string; type: string }[]).find((item) => item.type === 'expense');
  expect(category).toBeDefined();
  let isPaid = false;
  const item = {
    id: '00000000-0000-4000-8000-000000000001',
    category_id: category!.id,
    category_name: category!.name,
    fixed_expense_id: '00000000-0000-4000-8000-000000000002',
    type: 'expense', amount: '100.00', currency: 'BRL',
    description: 'Recorrência UI QA', transaction_date: '2026-09-23'
  };
  await page.route(/\/api\/v1\/transactions\?.*/, (route) => route.fulfill({
    status: 200, json: { items: [{ ...item, is_paid: isPaid }], total: 1, page: 1, page_size: 10 }
  }));
  await page.route(/\/api\/v1\/fixed-expenses\/[^/]+\/transactions\/[^/]+\/mark-paid$/, async (route) => {
    isPaid = Boolean((route.request().postDataJSON() as { is_paid: boolean }).is_paid);
    await new Promise((resolve) => setTimeout(resolve, 400));
    return route.fulfill({ status: 200, json: { ...item, is_paid: isPaid } });
  });
  await page.addInitScript((value) => localStorage.setItem('fintrack-token', value), token);
  await page.goto('/transactions');
  const row = page.locator('.feature-row').filter({ hasText: 'Recorrência UI QA' });
  await expect(row.getByRole('button', { name: 'Pendente' })).toBeVisible();
  await row.getByRole('button', { name: 'Pendente' }).click();
  await expect(page.getByText('Atualizando pagamento...')).toBeVisible();
  await expect(row.getByRole('button', { name: 'Pago' })).toBeVisible();
  await row.getByRole('button', { name: 'Pago' }).click();
  await expect(row.getByRole('button', { name: 'Pendente' })).toBeVisible();
});

test('erro de rede mostra mensagem compreensível no histórico', async ({ page, request }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1';
  const email = `erro-ui-${Date.now()}@example.com`;
  const password = 'senha-segura-123';
  expect((await request.post(`${apiBase}/auth/register`, { data: {
    name: 'QA Erro', email, password, default_currency: 'BRL'
  } })).status()).toBe(201);
  const login = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  const token = (await login.json()).access_token as string;
  await page.route(/\/api\/v1\/transactions\?.*/, (route) => route.fulfill({
    status: 503, json: { detail: 'Serviço temporariamente indisponível' }
  }));
  await page.addInitScript((value) => localStorage.setItem('fintrack-token', value), token);
  await page.goto('/transactions');
  await expect(page.getByRole('alert')).toContainText('Não foi possível carregar as transações.');
});

test('histórico mostra subtotais separados e duas casas por moeda', async ({ page, request }) => {
  const apiBase = 'http://127.0.0.1:8000/api/v1';
  const email = `moedas-ui-${Date.now()}@example.com`;
  const password = 'senha-segura-123';
  expect((await request.post(`${apiBase}/auth/register`, { data: {
    name: 'QA Moedas', email, password, default_currency: 'BRL'
  } })).status()).toBe(201);
  const login = await request.post(`${apiBase}/auth/login`, { data: { email, password } });
  const token = (await login.json()).access_token as string;
  const headers = { Authorization: `Bearer ${token}` };
  const categories = await request.get(`${apiBase}/categories`, { headers });
  const category = (await categories.json() as { id: string; type: string }[]).find((item) => item.type === 'expense');
  expect(category).toBeDefined();
  for (const [currency, amount] of [['BRL', '10'], ['USD', '5'], ['EUR', '3.5']]) {
    const response = await request.post(`${apiBase}/transactions`, { headers, data: {
      category_id: category!.id, type: 'expense', amount, currency,
      description: `Despesa ${currency}`, transaction_date: new Date().toISOString().slice(0, 10)
    } });
    expect(response.status()).toBe(201);
  }
  await page.addInitScript((value) => localStorage.setItem('fintrack-token', value), token);
  await page.goto('/transactions');
  const expenseSummary = page.locator('.ledger-summary > span').nth(2);
  await expect(expenseSummary).toContainText('R$');
  await expect(expenseSummary).toContainText('10,00');
  await expect(expenseSummary).toContainText('US$');
  await expect(expenseSummary).toContainText('5,00');
  await expect(expenseSummary).toContainText('€');
  await expect(expenseSummary).toContainText('3,50');
  await expect(expenseSummary.locator('strong span')).toHaveCount(3);
  await expect(expenseSummary).not.toContainText('18,50');
});
