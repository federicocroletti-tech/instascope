import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const demoRoutes = [
  '/',
  '/demo',
  '/demo/import',
  '/demo/pending-requests',
  '/demo/relationships',
  '/demo/recent',
  '/demo/recommendations',
  '/demo/insights',
  '/demo/privacy',
  '/demo/demographics',
  '/demo/settings',
];

test('public landing explains local processing and links to the synthetic demo', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/InstaScope/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Leggi i tuoi snapshot');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await expect(page.getByRole('link', { name: 'Esplora la demo sintetica' })).toBeVisible();
});

test('public local import URL opens the guided import without authentication', async ({ page }) => {
  await page.goto('/local/import');

  await expect(page).toHaveURL('/local/import');
  await expect(page.locator('#archive-file')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow, noarchive',
  );
});

test('CSP hashes allow the exact generated inline scripts without unsafe-inline', () => {
  const vercelConfig = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    headers: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
  };
  const policy = vercelConfig.headers
    .find((entry) => entry.source === '/(.*)')
    ?.headers.find((header) => header.key === 'Content-Security-Policy')?.value;
  expect(policy).toBeDefined();

  const scriptSources = policy?.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1];
  expect(scriptSources).toBeDefined();
  expect(scriptSources).not.toContain("'unsafe-inline'");

  const html = readFileSync('dist/instascope/browser/index.html', 'utf8');
  const executableInlineScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, attributes]) => !/\bsrc\s*=/.test(attributes))
    .filter(([, attributes]) => {
      const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1].toLowerCase();
      return (
        !type ||
        ['module', 'text/javascript', 'application/javascript', 'text/ecmascript'].includes(type)
      );
    });

  for (const [, , source] of executableInlineScripts) {
    const hash = createHash('sha256').update(source).digest('base64');
    expect(scriptSources).toContain(`'sha256-${hash}'`);
  }

  for (const hash of [
    'VM2mZqyEQZoLzoTrp5EigFvzQ0+f1wSeBuoOn95WHCg=',
    '8sGKvDKC8crv9OBcqEMvqrNDWlm1/80h7NJpJzqOnLI=',
    'LMY6wYoFV9I4wWzxaq1N/dTpl4iurQktw706UCHK3vM=',
  ]) {
    expect(scriptSources).toContain(`'sha256-${hash}'`);
  }
});

test('all demo routes work and clearly identify synthetic content', async ({ page }) => {
  for (const route of demoRoutes.slice(1)) {
    await page.goto(route);
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.getByText('Dati dimostrativi.', { exact: false })).toBeVisible();
  }

  await page.goto('/demo/relationships');
  await expect(page.getByText('demo_user_004').first()).toBeVisible();

  await page.goto('/demo/import');
  await expect(
    page.getByRole('heading', { name: 'Importa un archivio dati Instagram' }),
  ).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText(/Demo pubblica: il caricamento è disattivato/i)).toBeVisible();
});

test('private route stays closed without authentication and is noindex', async ({ page }) => {
  await page.goto('/app');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole('heading', { name: 'Accesso' })).toBeVisible();
  await expect(page.getByText(/Autenticazione non configurata/i)).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    'noindex, nofollow, noarchive',
  );
});

test('AI preview is explicitly local and stays offline on desktop and mobile', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/insights')) apiRequests.push(request.url());
  });
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/demo/insights');
    await expect(
      page.getByText('Nessun modello AI viene contattato.', { exact: false }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Mostra riepilogo di esempio' }).click();
    await expect(page.getByRole('heading', { name: 'Esempio locale' })).toBeVisible();
    await expect(page.locator('.answer')).toContainText('Possibili uscite: 1');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.getByRole('button', { name: 'Cancella risposta' }).click();
    await expect(page.getByRole('heading', { name: 'Esempio locale' })).toHaveCount(0);
  }
  await page.goto('/local/insights');
  await expect(page.getByText('AI non disponibile.', { exact: false })).toBeVisible();
  expect(apiRequests).toEqual([]);
});

test('public routes have no automated WCAG 2.2 A/AA violations', async ({ page }) => {
  test.setTimeout(120_000);
  for (const route of demoRoutes) {
    await page.goto(route);
    const result = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(result.violations, `${route} accessibility violations`).toEqual([]);
  }
});

test('mobile layout fits and navigation, theme, and keyboard commands work', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);

  await page.getByRole('button', { name: 'Attiva tema chiaro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Ricerca e comandi' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/demo');
  await page.getByRole('button', { name: 'Apri navigazione' }).click();
  await expect(page.getByRole('navigation', { name: 'Sezioni dell’app' })).toBeVisible();
});
