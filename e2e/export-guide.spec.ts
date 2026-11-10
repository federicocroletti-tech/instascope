import { expect, test } from '@playwright/test';

test('export guide maps Meta files to features and switches language', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Guida export', exact: true }).click();
  await expect(page).toHaveTitle('Guida export Instagram — InstaScope');
  await expect(page.getByRole('heading', { name: 'Esporta i tuoi dati Instagram' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apri Centro gestione account' })).toHaveAttribute(
    'href',
    'https://accountscenter.instagram.com/info_and_permissions/dyi/',
  );
  for (const file of [
    'followers_1.json',
    'followers_2.json',
    'following.json',
    'pending_follow_requests.json',
    'recently_unfollowed_profiles.json',
    'close_friends.json',
  ]) {
    await expect(page.getByText(file, { exact: true })).toBeVisible();
  }
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow');
  await page.getByLabel('Lingua', { exact: true }).selectOption('en-US');
  await expect(page.getByRole('heading', { name: 'Export your Instagram data' })).toBeVisible();
  await expect(page).toHaveTitle('Instagram export guide — InstaScope');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Open local analysis' }).click();
  await expect(page).toHaveURL(/\/local\/import$/);
  await expect(page.locator('#archive-file')).toBeVisible();
  await expect(page).not.toHaveTitle('Instagram export guide — InstaScope');
});

test('export guide is usable on mobile in both themes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/guida-export');
  await expect(page.getByRole('heading', { name: 'Esporta i tuoi dati Instagram' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Attiva tema chiaro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.getByRole('link', { name: 'Apri analisi locale' }).click();
  await expect(page.locator('#archive-file')).toBeVisible();
});

test('all local results are directly accessible without weakening protected app routes', async ({
  page,
}) => {
  await page.goto('/import');
  await expect(page).toHaveURL(/\/local\/import$/);
  await page.getByRole('link', { name: 'Guida export completa: file e sezioni' }).click();
  await expect(page.getByRole('heading', { name: 'Esporta i tuoi dati Instagram' })).toBeVisible();
  for (const route of [
    'pending-requests',
    'relationships',
    'recent',
    'recommendations',
    'insights',
  ]) {
    await page.goto(`/local/${route}`);
    await expect(page).toHaveURL(new RegExp(`/local/${route}$`));
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow, noarchive',
    );
    await expect(
      page
        .getByRole('navigation', { name: 'Sezioni dell’app' })
        .getByRole('link', { name: 'Guida export' }),
    ).toBeVisible();
  }
  await page.goto('/app/relationships');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('heading', { name: 'Accesso' })).toBeVisible();
});
