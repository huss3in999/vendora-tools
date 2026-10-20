// These frontends were removed before this release. Production deliberately returns
// HTTP 410; exercise that contract instead of the deleted calculator interface.
const { test, expect } = require('@playwright/test');
const origin = process.env.VENDORA_WRANGLER_BASE || 'http://127.0.0.1:8799';
for (const path of [
  "/tools/work-hours-overtime-calculator/"
]) {
  test('retired tool remains gone: ' + path, async ({ request }) => {
    const response = await request.get(origin + path);
    expect(response.status()).toBe(410);
    expect(await response.text()).toContain('decommissioned');
  });
}
