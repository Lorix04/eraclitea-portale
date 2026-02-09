import { test, expect } from "@playwright/test";

test.describe("Admin Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  await page.waitForSelector('input[type="email"], input[name="email"]');
  await page
    .locator('input[type="email"], input[name="email"]')
    .fill("admin@enteformazione.it");
  await page
    .locator('input[type="password"], input[name="password"]')
    .fill("admin123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await expect(page).toHaveURL("/admin");
  });

  test("should display admin dashboard with stats", async ({ page }) => {
    await expect(page.getByText(/clienti attivi/i)).toBeVisible();
    await expect(page.getByText(/corsi pubblicati/i)).toBeVisible();
  });

  test("should create new course", async ({ page }) => {
    await page.getByRole("link", { name: /corsi/i }).click();
    await page.getByRole("link", { name: /nuovo/i }).click();

    await page.getByLabel(/titolo/i).fill("E2E Test Course");
    await page.getByLabel(/descrizione/i).fill("Corso creato da test automatico");

    await page.getByRole("button", { name: /salva/i }).click();
    await expect(page.getByText(/corso/i)).toBeVisible();
  });

  test("should manage clients", async ({ page }) => {
    await page.getByRole("link", { name: /clienti/i }).click();
    await expect(page).toHaveURL("/admin/clienti");
    await expect(page.getByRole("heading", { name: /clienti/i })).toBeVisible();
  });

  test("should export CSV", async ({ page }) => {
    await page.goto("/admin/export");
    await expect(page.getByRole("heading", { name: /export/i })).toBeVisible();
  });
});
