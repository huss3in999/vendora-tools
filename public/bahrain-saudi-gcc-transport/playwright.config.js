import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const publicRoot = join(root, '..');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx --yes http-server . -p 4173 -c-1 --silent',
    cwd: publicRoot,
    url: 'http://127.0.0.1:4173/bahrain-saudi-gcc-transport/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
