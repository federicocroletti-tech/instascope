import { expect, test, type Page } from '@playwright/test';

const vaultPassphrase = 'test-passphrase-1';

const owner = {
  id: 'e2e-owner',
  app_metadata: { role: 'owner' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00.000Z',
};

async function openImports(page: Page): Promise<void> {
  const session = {
    access_token: 'e2e-access-token',
    refresh_token: 'e2e-refresh-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: owner,
  };

  await page.addInitScript((authSession) => {
    Object.defineProperty(window, '__INSTASCOPE_CONFIG__', {
      configurable: true,
      value: {
        supabaseUrl: 'https://e2e.supabase.co',
        supabaseAnonKey: 'e2e-anon-key',
        siteUrl: 'http://127.0.0.1:4300',
      },
    });
    window.sessionStorage.setItem('sb-e2e-auth-token', JSON.stringify(authSession));
  }, session);

  await page.route('https://e2e.supabase.co/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() !== 'GET' || url.pathname !== '/auth/v1/user') {
      await route.abort();
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(owner),
    });
  });

  await page.goto('/app/imports');
  await expect(
    page.getByRole('heading', { name: 'Importa un archivio dati Instagram' }),
  ).toBeVisible();
}

async function uploadJson(
  page: Page,
  filename: string,
  datasets: Record<string, unknown>,
): Promise<void> {
  await page.locator('#archive-file').setInputFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(datasets)),
  });
  await page.getByRole('button', { name: 'Analizza e mostra anteprima' }).click();
  await expect(
    page.getByRole('heading', { name: 'Riepilogo prima del salvataggio' }),
  ).toBeVisible();
}

async function saveImport(page: Page, passphrase: string): Promise<void> {
  await page.getByLabel('Passphrase (minimo 12 caratteri)').fill(passphrase);
  await page.getByRole('button', { name: 'Conferma importazione e salva in IndexedDB' }).click();
  await expect(
    page.locator('.preview-card [role="status"]').filter({ hasText: 'Import completato' }),
  ).toBeVisible();
}

async function readSnapshotVersions(page: Page): Promise<number[]> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('instascope-local-v1');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const versions = await new Promise<number[]>((resolve, reject) => {
      const request = database
        .transaction('snapshots', 'readonly')
        .objectStore('snapshots')
        .getAll();
      request.onsuccess = () => {
        const records = request.result as Array<{ version: number }>;
        resolve(records.map(({ version }) => version).sort());
      };
      request.onerror = () => reject(request.error);
    });
    database.close();
    return versions;
  });
}

test('import detects categories and applies replacement, integrate-new, and merge-update', async ({
  page,
}) => {
  await openImports(page);

  await uploadJson(page, 'initial-export.json', {
    relationships_followers: [
      {
        string_list_data: [{ value: 'CurrentOne', href: 'https://www.instagram.com/currentone/' }],
      },
      {
        string_list_data: [{ value: 'CurrentTwo', href: 'https://www.instagram.com/currenttwo/' }],
      },
    ],
    relationships_following: [
      {
        string_list_data: [
          { value: 'FollowingOne', href: 'https://www.instagram.com/followingone/' },
        ],
      },
    ],
  });
  const preview = page.locator('.preview-card');
  const categories = preview.locator('dl.dataset-list').first().locator('div');
  await expect(categories.nth(0)).toContainText('2');
  await expect(categories.nth(1)).toContainText('1');
  await expect(categories.nth(2)).toContainText('Categoria assente');
  const modeHelp = preview.locator('details.mode-help');
  await expect(modeHelp).toHaveJSProperty('open', false);
  await modeHelp.locator('summary').click();
  await expect(modeHelp).toContainText('Sostituisci:');

  const saveButton = page.getByRole('button', {
    name: 'Conferma importazione e salva in IndexedDB',
  });
  await page.getByLabel('Passphrase (minimo 12 caratteri)').fill(vaultPassphrase);
  await expect(saveButton).toBeDisabled();
  await page.getByRole('checkbox').first().check();
  await expect(saveButton).toBeEnabled();
  await saveButton.click();
  await expect(preview.getByRole('status').filter({ hasText: '0 sostituiti' })).toBeVisible();

  await uploadJson(page, 'replacement-export.json', {
    relationships_followers: [
      {
        string_list_data: [
          { value: 'ReplacementUser', href: 'https://www.instagram.com/replacementuser/' },
        ],
      },
    ],
  });
  await expect(preview).toContainText('Categoria assente');
  await expect(preview).toContainText('Profili correnti sostituiti');
  await expect(
    preview.locator('dl[aria-label="Effetto previsto dell’importazione"]'),
  ).toContainText('3');
  await expect(saveButton).toBeDisabled();
  await page
    .getByLabel(
      'Confermo la sostituzione dei dati correnti; gli snapshot storici non verranno modificati',
    )
    .check();
  await saveImport(page, vaultPassphrase);
  await expect(preview.getByRole('status').filter({ hasText: '3 sostituiti' })).toBeVisible();

  await uploadJson(page, 'integrate-export.json', {
    relationships_followers: [
      {
        string_list_data: [
          { value: 'ReplacementUser', href: 'https://www.instagram.com/changed/' },
        ],
      },
      { string_list_data: [{ value: 'IntegratedUser' }] },
    ],
  });
  await page.getByLabel('Modalità di importazione').selectOption('integrate-new');
  const effect = preview.locator('dl[aria-label="Effetto previsto dell’importazione"]');
  await expect(effect).toContainText('1');
  await expect(effect).toContainText('Profili ignorati per conflitto');
  await saveImport(page, vaultPassphrase);
  await expect(
    preview.getByRole('status').filter({ hasText: '1 aggiunti · 0 aggiornati · 1 ignorati' }),
  ).toBeVisible();

  await uploadJson(page, 'merge-export.json', {
    relationships_followers: [
      {
        string_list_data: [
          { value: 'replacementuser', href: 'https://www.instagram.com/updated/' },
        ],
      },
      { string_list_data: [{ value: 'MergedUser' }] },
    ],
  });
  await page.getByLabel('Modalità di importazione').selectOption('merge-update');
  await expect(effect).toContainText('Profili aggiornati');
  await saveImport(page, vaultPassphrase);
  await expect(
    preview.getByRole('status').filter({ hasText: '1 aggiunti · 1 aggiornati · 0 ignorati' }),
  ).toBeVisible();
  expect(await readSnapshotVersions(page)).toEqual([1, 1, 1, 1]);
});

test('import source chooser links to ZIP and does not offer a fake Meta login', async ({
  page,
}) => {
  await openImports(page);

  await expect(page.getByRole('heading', { name: 'Scegli come recuperare i dati' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Scegli ZIP o JSON' })).toHaveAttribute(
    'href',
    '#file-title',
  );
  await expect(page.getByRole('button', { name: 'Accesso API non disponibile' })).toBeDisabled();
  await expect(
    page.getByText(/non forniscono la lista dei follower o degli unfollower/),
  ).toBeVisible();
});

test('public import demo explains that archive upload and Meta login are unavailable', async ({
  page,
}) => {
  await page.goto('/demo/import');

  await expect(page.getByRole('heading', { name: 'Scegli come recuperare i dati' })).toBeVisible();
  await expect(page.getByText('Caricamento disattivato nella demo')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accesso API non disponibile' })).toBeDisabled();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});
