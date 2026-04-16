const path = require('path');
const { defineConfig } = require('@playwright/test');

const publicRoot = path.join(__dirname, '..');

module.exports = defineConfig({
  testDir: path.join(__dirname, 'tests'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx --yes http-server . -p 4173 -c-1 --silent',
    cwd: publicRoot,
    url: 'http://127.0.0.1:4173/tools/ai-profit-leak-finder/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
