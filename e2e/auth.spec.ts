import { test, expect } from "@playwright/test";
import { COOKIE_CONSENT, loginAsClient } from "./fixtures";

test.describe("Authentication", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([COOKIE_CONSENT]);
  });

  test("should show login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: /accedi/i })).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  });

  test("should login successfully as client", async ({ page }) => {
    await loginAsClient(page);
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");
    await page.waitForSelector('input[type="email"], input[name="email"]');
    await page.locator('input[type="email"], input[name="email"]').fill("fake@test.com");
    await page.locator('input[type="password"], input[name="password"]').fill("wrongpassword");
    await page.getByRole("button", { name: /accedi/i }).click();
    await expect(page.getByText(/credenziali non valide/i)).toBeVisible({ timeout: 5000 });
  });

  test("should logout successfully", async ({ page }) => {
    await loginAsClient(page);
    await page.getByRole("button", { name: /esci/i }).first().click();
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test("should navigate to password recovery", async ({ page }) => {
    await page.goto("/login");
    await page.getByText(/password dimenticata/i).click();
    await expect(page).toHaveURL(/\/recupera-password/, { timeout: 5000 });
    await expect(page.getByRole("heading", { name: /recupera password/i })).toBeVisible();
  });
});
