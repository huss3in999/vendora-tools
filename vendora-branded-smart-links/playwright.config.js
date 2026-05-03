import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:8791",
    ignoreHTTPSErrors: true
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npx wrangler dev --local --ip 127.0.0.1 --port 8791 --persist-to .wrangler/state --log-level info",
        url: "http://127.0.0.1:8791",
        reuseExistingServer: true,
        timeout: 120000
      }
});


