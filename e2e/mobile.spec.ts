import { test, expect, devices } from "@playwright/test";

test.use(devices["iPhone 13"]);

test.describe("Mobile Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  await page.waitForSelector('input[type="email"], input[name="email"]');
  await page
    .locator('input[type="email"], input[name="email"]')
    .fill("mario@acme.it");
  await page
    .locator('input[type="password"], input[name="password"]')
    .fill("cliente123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("should show mobile menu button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /apri menu/i })).toBeVisible();
  });

  test("should open and close mobile sidebar", async ({ page }) => {
    const openButton = page.getByRole("button", { name: /apri menu/i });
    await openButton.click();

    const dialog = page.getByRole("dialog", { name: /menu mobile/i });
    await expect(dialog).toBeVisible();

    await page.getByRole("button", { name: /chiudi menu/i }).click();
    await expect(dialog).toBeHidden();
  });

  test("should navigate from mobile sidebar", async ({ page }) => {
    await page.getByRole("button", { name: /apri menu/i }).click();
    await page.getByRole("link", { name: /corsi/i }).click();

    await expect(page).toHaveURL(/\/corsi/);
  });
});
