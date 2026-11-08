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

test('public local import URL redirects to landing without exposing file upload', async ({
  page,
}) => {
  await page.goto('/local/import');

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Leggi i tuoi snapshot/ })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
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
  await expect(page.getByRole('heading', { name: 'Importa un export' })).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText(/upload è disattivato/i)).toBeVisible();
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

test('public routes have no automated WCAG 2.2 A/AA violations', async ({ page }) => {
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

  await page.getByRole('button', { name: 'Apri navigazione' }).click();
  await expect(page.getByRole('navigation', { name: 'Sezioni dell’app' })).toBeVisible();
});
