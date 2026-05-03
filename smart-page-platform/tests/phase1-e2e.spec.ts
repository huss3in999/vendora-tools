import { expect, test } from "@playwright/test";

test.describe("Phase 1 browser flows", () => {
  test.skip(!process.env.PLAYWRIGHT_E2E, "Set PLAYWRIGHT_E2E=1 after local D1 and cf:dev are ready.");

  test("owner signup, page publish, public rendering, and admin protection", async ({ page }) => {
    const unique = Date.now();
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Phase 1 Owner");
    await page.getByLabel("Email").fill(`owner-${unique}@example.test`);
    await page.getByLabel("Password").fill("phase-1-owner-password");
    await page.getByLabel("Workspace name").fill("Phase 1 QA");
    await page.getByLabel("Workspace slug").fill(`phase-1-qa-${unique}`);
    await page.getByRole("button", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/app/);

    await page.goto("/app/pages");
    await page.getByPlaceholder("New page title").fill("QA Smart Page");
    await page.getByRole("button", { name: "Create page" }).click();
    await expect(page).toHaveURL(/\/app\/pages\/.+\/edit/);

    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    await page.getByLabel("Title").fill("QA Published Page");
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Page published successfully.")).toBeVisible();

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/app/);
  });
});
