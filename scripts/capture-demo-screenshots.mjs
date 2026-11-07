import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, '..');
const screenshotDirectory = resolve(projectRoot, 'public', 'assets', 'previews');
const port = '4202';
const server = spawn(process.execPath, [join(scriptDirectory, 'serve-static.mjs')], {
  env: { ...process.env, PORT: port },
  stdio: 'inherit',
});

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/demo`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 500));
    }
  }
  throw new Error('The local demo server did not start in time.');
}

await mkdir(screenshotDirectory, { recursive: true });

let browser;
try {
  await waitForServer();
  browser = await chromium.launch();

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${port}/demo`, { waitUntil: 'networkidle' });
    await page.getByText('Dati dimostrativi.', { exact: false }).first().waitFor();
    await page.screenshot({
      path: join(screenshotDirectory, `instascope-${viewport.name}.png`),
      fullPage: true,
    });
    await page.close();
  }
} finally {
  await browser?.close();
  server.kill();
}
