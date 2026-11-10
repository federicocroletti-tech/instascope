import { expect, test } from '@playwright/test';

test('demo Unfollow keeps the requested navigation and tab categories', async ({ page }) => {
  await page.goto('/demo/unfollow');

  await expect(page.getByRole('heading', { name: 'Unfollow', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Importa', exact: true })).toBeVisible();

  const navigation = page.getByRole('navigation', { name: 'Sezioni dell’app' });
  await expect(navigation.getByRole('link')).toHaveText([
    'Riepilogo',
    'Importa archivio',
    'Confronto follower',
    'Richieste in sospeso',
    'Suggeriti',
    'Relazioni',
    'Ultimi aggiunti',
    'Impostazioni',
  ]);

  const followedTab = page.getByRole('tab', { name: 'Li seguo ancora', exact: true });
  const notFollowedTab = page.getByRole('tab', { name: 'Non li seguo più', exact: true });
  await expect(followedTab).toHaveAttribute('aria-selected', 'true');
  await notFollowedTab.click();
  await expect(notFollowedTab).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('button', { name: 'Attiva tema chiaro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).not.toBeVisible();
  await page.getByRole('button', { name: 'Apri navigazione' }).click();
  await expect(navigation).toBeVisible();
});

test('demo Dashboard summarizes available data and uses demo-only actions', async ({ page }) => {
  await page.goto('/demo');

  await expect(page.getByRole('heading', { name: 'Dashboard', exact: true })).toBeVisible();
  await expect(page.locator('.metrics .card')).toHaveCount(5);
  await expect(page.getByText('Ultimo import')).toBeVisible();
  await expect(page.getByText('Categorie nell’export')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apri Unfollow' })).toHaveAttribute(
    'href',
    '/demo/unfollow',
  );
  await expect(page.getByRole('link', { name: 'Importa', exact: true })).toHaveAttribute(
    'href',
    '/demo/import',
  );
});

test('English locale persists and dashboard trend exports as CSV', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Lingua').selectOption('en-US');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Explore the sample demo')).toBeVisible();
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Demo', exact: true })
    .click();

  await expect(page.getByText('Latest import')).toBeVisible();
  await expect(page.locator('.summary-status dd').first()).toContainText('Nov 1, 2026');
  await expect(page.getByRole('link', { name: 'Recently added' })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export CSV data' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('instascope-follower-following-trend.csv');

  await page.reload();
  await expect(page.getByText('Latest import')).toBeVisible();
  await expect(page.getByLabel('Language')).toHaveValue('en-US');
});

test('public navigation remains available on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const navigation = page.getByRole('navigation', { name: 'Navigazione principale' });
  await expect(navigation.getByRole('link', { name: 'Panoramica' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Demo' })).toBeVisible();
  await expect(navigation.getByRole('link', { name: 'Area privata' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apri navigazione' })).toHaveCount(0);
});
