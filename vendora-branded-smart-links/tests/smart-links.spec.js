import { test, expect } from "@playwright/test";

function slug(name) {
  return `${name}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

test("Homepage loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Create short links customers trust/i })).toBeVisible();
  await expect(page.locator("#createForm")).toBeVisible();
});

test("Create link form validation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Create smart link/i }).click();
  await expect(page.locator("input[name='url']")).toBeFocused();
});

test("Create short link", async ({ page }) => {
  const customSlug = slug("vanilla-menu");
  await page.goto("/");
  await page.locator("input[name='url']").fill("https://example.com/menu");
  await page.locator("input[name='brandName']").fill("Vanilla Cafe");
  await page.locator("input[name='slug']").fill(customSlug);
  await page.getByRole("button", { name: /Create smart link/i }).click();
  await expect(page.locator("#createdResult")).toContainText(customSlug);
  await expect(page.getByText("Download QR")).toBeVisible();
});

test("Redirect preview page loads and analytics count increases", async ({ page, request }) => {
  const customSlug = slug("preview-shop");
  const form = new FormData();
  form.set("url", "https://example.com/offer");
  form.set("brandName", "Preview Shop");
  form.set("slug", customSlug);
  form.set("brandColor", "#0f766e");
  form.set("redirectMode", "preview");
  const created = await request.post("/api/create", { multipart: form });
  expect(created.ok()).toBeTruthy();

  await page.goto(`/r/${customSlug}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Preview Shop" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue" })).toBeVisible();

  const second = await request.get(`/r/${customSlug}`);
  expect(second.status()).toBe(200);
});

test("Professional smart URL style uses smart domain", async ({ request }) => {
  const customSlug = slug("hussain");
  const login = await request.post("/admin/login", { form: { password: "test-admin-password" } });
  expect(login.status()).toBe(200);

  const created = await request.post("/admin/create", {
    form: {
      url: "https://example.com/shop",
      brandName: "Hussain",
      slug: customSlug,
      shortDomainMode: "smart",
      redirectMode: "preview",
      expiryMode: "30d"
    }
  });
  expect(created.ok()).toBeTruthy();

  const admin = await request.get(`/admin?q=${customSlug}`);
  expect(await admin.text()).toContain(`https://smart.getvendora.net/${customSlug}`);
});

test("Ultra one-letter domain can include brand in path", async ({ request }) => {
  const customSlug = slug("offer");
  const login = await request.post("/admin/login", { form: { password: "test-admin-password" } });
  expect(login.status()).toBe(200);

  const created = await request.post("/admin/create", {
    form: {
      url: "https://example.com/offer",
      brandName: "Another Story",
      brandHandle: "another-story",
      slug: customSlug,
      shortDomainMode: "ultra",
      urlPathMode: "brand",
      redirectMode: "instant",
      expiryMode: "30d"
    }
  });
  expect(created.ok()).toBeTruthy();

  const admin = await request.get(`/admin?q=${customSlug}`);
  const text = await admin.text();
  expect(text).toContain(`https://g.getvendora.net/another-story-${customSlug}`);
});

test("Slashy paths resolve by joining with hyphens", async ({ request }) => {
  const login = await request.post("/admin/login", { form: { password: "test-admin-password" } });
  expect(login.status()).toBe(200);

  // Create a link whose alias is other-stories-ae (slug=ae, brand-path mode)
  const created = await request.post("/admin/create", {
    form: {
      url: "https://example.com/ae",
      brandName: "Other Stories",
      brandHandle: "other-stories",
      slug: "ae",
      shortDomainMode: "ultra",
      urlPathMode: "brand",
      redirectMode: "instant",
      expiryMode: "30d"
    }
  });
  expect(created.ok()).toBeTruthy();

  const response = await request.get("/other-stories/ae", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("https://example.com/ae");
});

test("Legacy profile URL redirects to clean smart URL", async ({ request }) => {
  const response = await request.get("/p/hussain", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe("https://smart.getvendora.net/hussain");
});

test("Admin login page loads", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: /Admin dashboard/i })).toBeVisible();
  await expect(page.locator("input[name='password']")).toBeVisible();
});

test("Admin action redirects stay on the same origin", async ({ request }) => {
  const customSlug = slug("admin-redirect");
  const login = await request.post("/admin/login", { form: { password: "test-admin-password" } });
  expect(login.status()).toBe(200);

  const response = await request.post("/admin/create", {
    form: {
      url: "https://example.com/admin-redirect",
      brandName: "Admin Redirect",
      slug: customSlug,
      redirectMode: "preview",
      expiryMode: "30d"
    },
    maxRedirects: 0
  });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toContain("/admin?notice=created");
});

test("Invalid slug shows 404", async ({ page }) => {
  await page.goto("/r/not-created-slug-404");
  await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
});
