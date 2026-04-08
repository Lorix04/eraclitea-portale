import { test, expect } from "@playwright/test";
import { COOKIE_CONSENT, loginAsClient } from "./fixtures";

test.describe("Mobile Experience", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([COOKIE_CONSENT]);
    await loginAsClient(page);
  });

  test("should show hamburger menu on mobile", async ({ page }) => {
    // On mobile the sidebar is hidden, hamburger button appears
    const menuButton = page.getByRole("button", { name: /apri menu/i });
    await expect(menuButton).toBeVisible({ timeout: 5000 });
  });

  test("should open mobile sidebar and navigate", async ({ page }) => {
    await page.getByRole("button", { name: /apri menu/i }).click();
    // Click a sidebar link
    await page.getByRole("link", { name: /corsi/i }).first().click();
    await expect(page).toHaveURL(/\/corsi/);
  });

  test("should be responsive on login page", async ({ page }) => {
    // Logout first
    await page.getByRole("button", { name: /apri menu/i }).click();
    await page.getByRole("button", { name: /esci/i }).first().click();
    await expect(page).toHaveURL(/\/login/);
    // Verify login form is usable on mobile
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: /accedi/i })).toBeVisible();
  });
});
