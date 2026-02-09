import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole("heading", { name: /accedi/i })).toBeVisible();
  });

  test("should login successfully with valid credentials", async ({ page }) => {
    await page.goto("/login");

  await page.waitForSelector('input[type="email"], input[name="email"]');
  await page
    .locator('input[type="email"], input[name="email"]')
    .fill("mario@acme.it");
  await page
    .locator('input[type="password"], input[name="password"]')
    .fill("cliente123");
    await page.getByRole("button", { name: /accedi/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/dashboard/i)).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

  await page.waitForSelector('input[type="email"], input[name="email"]');
  await page
    .locator('input[type="email"], input[name="email"]')
    .fill("mario@acme.it");
  await page
    .locator('input[type="password"], input[name="password"]')
    .fill("wrongpassword");
    await page.getByRole("button", { name: /accedi/i }).click();

    await expect(page.getByText(/credenziali non valide/i)).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    await page.goto("/login");
  await page.waitForSelector('input[type="email"], input[name="email"]');
  await page
    .locator('input[type="email"], input[name="email"]')
    .fill("mario@acme.it");
  await page
    .locator('input[type="password"], input[name="password"]')
    .fill("cliente123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await expect(page).toHaveURL("/");

    await page.getByRole("button", { name: /logout/i }).click();
    await expect(page).toHaveURL(/.*login/);
  });
});
