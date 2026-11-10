import { expect, test } from '@playwright/test';
import JSZip from 'jszip';

const passphrase = 'local-workspace-test-passphrase';

test('local workspace is public without an account while the protected app still requires sign-in', async ({
  page,
}) => {
  await page.goto('/app/imports');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  await expect(page.getByRole('heading', { name: 'Accesso' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: 'Inizia senza account' }).click();
  await expect(page).toHaveURL(/\/local\/import$/);
  await expect(page.locator('#archive-file')).toBeVisible();
});

test('lost follower review selects profiles, exports CSV and resets on comparison changes', async ({
  page,
  baseURL,
}) => {
  if (!baseURL) throw new Error('The browser tests require a baseURL.');
  const appOrigin = new URL(baseURL).origin;
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && url.origin !== appOrigin) {
      externalRequests.push(url.origin);
    }
  });
  await page.goto('/local/import');
  await importMetaExport(
    page,
    'first.zip',
    ['alice', 'lost_one', 'lost_two', 'not_followed'],
    ['lost_one', 'lost_two'],
  );
  await importMetaExport(
    page,
    'second.zip',
    ['alice', 'lost_one', 'lost_two'],
    ['lost_one', 'lost_two'],
  );
  await importMetaExport(page, 'third.zip', ['alice'], ['lost_one', 'lost_two']);
  const nav = page.getByRole('navigation', { name: 'Sezioni dell’app' });
  await nav.getByRole('link', { name: 'Confronto follower' }).click();
  const all = page.getByRole('checkbox', { name: 'Seleziona tutti per la revisione' });
  const one = page.getByRole('checkbox', { name: 'Seleziona lost_one per la revisione' });
  await one.check();
  const review = page.locator('.selected-unfollow-list');
  await expect(review).toContainText('1 selezionati');
  await expect(all).toHaveJSProperty('indeterminate', true);
  await all.check();
  await expect(review).toContainText('2 selezionati');
  await expect(
    review.getByRole('link', { name: 'https://www.instagram.com/lost_one/' }),
  ).toHaveAttribute('rel', 'noopener noreferrer');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Esporta selezionati CSV' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('instascope-selected-profiles.csv');
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('"lost_one","https://www.instagram.com/lost_one/"');
  expect(csv).toContain('"lost_two","https://www.instagram.com/lost_two/"');
  expect(csv).not.toContain('not_followed');
  await page.getByRole('tab', { name: 'Non li seguo più', exact: true }).click();
  await expect(review).toContainText('2 selezionati');
  await page.getByRole('tab', { name: 'Li seguo ancora', exact: true }).click();
  await expect(all).toBeChecked();
  await page.getByRole('button', { name: 'Deseleziona tutti' }).click();
  await expect(review).toHaveCount(0);
  await one.check();
  await page.locator('#comparison-current').selectOption({ index: 1 });
  await expect(review).toHaveCount(0);
  await page.locator('#comparison-current').selectOption({ index: 0 });
  await expect(
    page.getByRole('checkbox', { name: 'Seleziona lost_one per la revisione' }),
  ).not.toBeChecked();
  await nav.getByRole('link', { name: 'Relazioni', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Relazioni tra account' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'lost_one', exact: true }).first()).toBeVisible();
  await nav.getByRole('link', { name: 'Dati e privacy' }).click();
  await expect(page.locator('.snapshot-list li')).toHaveCount(3);
  await page.reload();
  await page.getByLabel('Passphrase locale').fill(passphrase);
  await page.getByRole('button', { name: 'Sblocca', exact: true }).click();
  await expect(page.locator('.snapshot-list li')).toHaveCount(3);
  expect(externalRequests).toEqual([]);
});

function archive(
  usernames: string[],
  includeFollowers = true,
  includeFollowing = true,
): Record<string, unknown> {
  return {
    ...(includeFollowers
      ? {
          relationships_followers: usernames.map((username) => ({
            string_list_data: [{ value: username, href: `https://www.instagram.com/${username}/` }],
          })),
        }
      : {}),
    ...(includeFollowing ? { relationships_following: [] } : {}),
  };
}

async function importSnapshot(
  page: import('@playwright/test').Page,
  filename: string,
  usernames: string[],
  includeFollowers = true,
  includeFollowing = true,
): Promise<void> {
  await page.locator('#archive-file').setInputFiles({
    name: filename,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive(usernames, includeFollowers, includeFollowing))),
  });
  await expect(page.locator('.import-workflow li[aria-current="step"]')).toContainText('Analisi');
  await page.getByRole('button', { name: 'Analizza e mostra anteprima' }).click();
  await expect(page.locator('.import-workflow li[aria-current="step"]')).toContainText(
    'Verifica e salva',
  );
  await expect(
    page.getByRole('heading', { name: 'Riepilogo prima del salvataggio' }),
  ).toBeVisible();
  await page
    .getByLabel(
      'Confermo la sostituzione dei dati correnti; gli snapshot storici non verranno modificati',
    )
    .check();
  await page.getByLabel('Passphrase (minimo 12 caratteri)').fill(passphrase);
  await page.getByRole('button', { name: 'Conferma importazione e salva in IndexedDB' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Import completato' })).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.locator('.import-workflow li[aria-current="step"]')).toContainText('Risultati');
  await expect(page.getByRole('link', { name: 'Apri riepilogo' })).toBeVisible();
}

async function metaExport(followers: string[], following: string[]): Promise<Buffer> {
  const zip = new JSZip();
  const folder = 'connections/followers_and_following';
  const records = (usernames: string[]) =>
    usernames.map((username) => ({
      string_list_data: [{ value: username }],
    }));
  zip.file(`${folder}/followers_1.json`, JSON.stringify(records(followers.slice(0, 2))));
  zip.file(`${folder}/followers_2.json`, JSON.stringify(records(followers.slice(2))));
  zip.file(`${folder}/following.json`, JSON.stringify(records(following)));
  return Buffer.from(await zip.generateAsync({ type: 'nodebuffer' }));
}

async function importMetaExport(
  page: import('@playwright/test').Page,
  filename: string,
  followers: string[],
  following: string[],
): Promise<void> {
  await page.locator('#archive-file').setInputFiles({
    name: filename,
    mimeType: 'application/zip',
    buffer: await metaExport(followers, following),
  });
  await page.getByRole('button', { name: 'Analizza e mostra anteprima' }).click();
  await expect(
    page.getByRole('heading', { name: 'Riepilogo prima del salvataggio' }),
  ).toBeVisible();
  await page
    .getByLabel(
      'Confermo la sostituzione dei dati correnti; gli snapshot storici non verranno modificati',
    )
    .check();
  await page.getByLabel('Passphrase (minimo 12 caratteri)').fill(passphrase);
  await page.getByRole('button', { name: 'Conferma importazione e salva in IndexedDB' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Import completato' })).toBeVisible({
    timeout: 15_000,
  });
}

test('local workspace imports two archives and shows a possible unfollow without signing in', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Inizia senza account' }).click();

  await expect(page).toHaveURL(/\/local\/import$/);
  await expect(page.getByText('Analisi locale · senza account')).toBeVisible();
  await expect(page.locator('#archive-file')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Fasi per analizzare l’archivio' })).toBeVisible();
  await expect(page.locator('.import-workflow li[aria-current="step"]')).toContainText('Archivio');
  await expect(
    page.getByRole('navigation', { name: 'Sezioni dell’app' }).getByRole('link', {
      name: 'Importa archivio',
    }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Accedi' })).toHaveCount(0);
  await page.getByText('Come scarico l’archivio follower da Instagram?').click();
  await expect(
    page.getByRole('link', { name: 'Guida ufficiale Meta per accedere ai tuoi dati' }),
  ).toHaveAttribute('href', 'https://help.instagram.com/181231772500920');

  await importSnapshot(page, 'first-export.json', ['alice', 'lost_account']);
  await expect(page.getByRole('link', { name: 'Importa il secondo archivio' })).toBeVisible();
  await importSnapshot(page, 'second-export.json', ['alice']);
  await expect(page.getByRole('link', { name: 'Confronta follower' })).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await expect(page.getByRole('heading', { name: 'Unfollow', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Non li seguo più', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Li seguo ancora', exact: true })).toContainText('0');
  await expect(page.getByRole('tab', { name: 'Non li seguo più', exact: true })).toContainText('1');
  await expect(page.getByRole('row', { name: /lost_account/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Importa un altro archivio' })).toHaveAttribute(
    'href',
    '/local/import',
  );
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Dati e privacy' })
    .click();
  await expect(page.getByRole('heading', { name: 'Centro privacy' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Snapshot salvati localmente' })).toBeVisible();
  await expect(page.getByText('Questo percorso non usa login o Supabase.')).toBeVisible();

  await page.goto('/local/dashboard');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sblocca i tuoi dati locali' })).toBeVisible();
  await page.getByRole('link', { name: 'Sblocca dal centro privacy' }).click();
  await page.getByLabel('Passphrase locale').fill(passphrase);
  await page.getByRole('button', { name: 'Sblocca' }).click();
  await expect(page.getByRole('heading', { name: 'Snapshot salvati localmente' })).toBeVisible();
  await expect(page.locator('.snapshot-list li')).toHaveCount(2);
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await page.getByRole('tab', { name: 'Non li seguo più', exact: true }).click();
  await expect(page.getByRole('row', { name: /lost_account/ })).toBeVisible();
});

test('local Unfollow explains lost followers and separates them from accounts still followed', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Inizia senza account' }).click();

  await importMetaExport(
    page,
    'older-meta-export.zip',
    ['alice', 'still_followed', 'not_followed'],
    ['still_followed'],
  );
  await importMetaExport(page, 'latest-meta-export.zip', ['alice'], ['still_followed']);

  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();

  await expect(
    page.getByText(
      'Account presenti tra i follower nello snapshot precedente e assenti in quello più recente. Le schede distinguono se li segui ancora o no.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Li seguo ancora', exact: true })).toBeVisible();
  await expect(page.getByRole('row', { name: /still_followed/ })).toBeVisible();

  await page.getByRole('tab', { name: 'Non li seguo più', exact: true }).click();
  await expect(page.getByRole('row', { name: /not_followed/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /still_followed/ })).toHaveCount(0);
});

test('local Unfollow explains which snapshot or dataset is missing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Inizia senza account' }).click();
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();

  await expect(
    page.getByText(
      'Non hai ancora snapshot da confrontare. Importa un archivio Instagram con i dati Follower.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Importa un altro archivio' })).toHaveAttribute(
    'href',
    '/local/import',
  );

  await page.getByRole('link', { name: 'Importa un altro archivio' }).click();
  await importSnapshot(page, 'first-complete.json', ['first'], true, true);
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await expect(
    page.getByText(
      'Hai un solo snapshot. Importane un secondo creato in un momento diverso per trovare i possibili unfollow.',
    ),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Importa un altro archivio' }).click();
  await importSnapshot(page, 'missing-previous-data.json', [], false, true);
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await expect(
    page.getByText(
      'Lo snapshot più recente non contiene il dataset Follower. Importa un archivio che includa Follower.',
    ),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Importa un altro archivio' }).click();
  await importSnapshot(page, 'complete-latest.json', ['latest'], true, true);
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await expect(
    page.getByText(
      'Lo snapshot precedente non contiene il dataset Follower. Importa un archivio precedente che includa Follower.',
    ),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Importa un altro archivio' }).click();
  await importSnapshot(page, 'missing-current-data.json', ['current'], true, false);
  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await expect(
    page.getByText(
      'Lo snapshot più recente non contiene il dataset Following, necessario per distinguere le categorie Unfollow.',
    ),
  ).toBeVisible();
});

test('local Unfollow can compare an earlier pair of saved snapshots', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Inizia senza account' }).click();

  await importSnapshot(page, 'older-snapshot.json', ['lost_in_old', 'lost_in_middle', 'keep']);
  await importSnapshot(page, 'middle-snapshot.json', ['lost_in_middle', 'keep']);
  await importSnapshot(page, 'latest-snapshot.json', ['keep', 'latest']);

  await page
    .getByRole('navigation', { name: 'Sezioni dell’app' })
    .getByRole('link', { name: 'Confronto follower' })
    .click();
  await expect(page.getByLabel('Snapshot più recente')).toBeVisible();
  await expect(page.getByLabel('Snapshot precedente')).toBeVisible();
  await page.getByRole('tab', { name: 'Non li seguo più', exact: true }).click();
  await expect(page.getByRole('row', { name: /lost_in_middle/ })).toBeVisible();

  await page.getByLabel('Snapshot più recente').selectOption({ index: 1 });
  await expect(page.getByRole('row', { name: /lost_in_old/ })).toBeVisible();
  await expect(page.getByRole('row', { name: /lost_in_middle/ })).toHaveCount(0);
});
