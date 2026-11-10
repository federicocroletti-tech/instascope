import { defineConfig, devices } from '@playwright/test';

const port = process.env['PORT'] ?? '4300';
const deployedUrl = process.env['PLAYWRIGHT_BASE_URL'];

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env['CI']),
  retries: process.env['CI'] ? 1 : 0,
  workers: process.env['CI'] ? 2 : undefined,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: deployedUrl ?? `http://127.0.0.1:${port}`,
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: deployedUrl
    ? undefined
    : {
        command: 'corepack pnpm run build && corepack pnpm serve:static',
        env: { PORT: port },
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: !process.env['CI'],
        timeout: 120_000,
      },
});
