import { test, expect } from "@playwright/test";
import { COOKIE_CONSENT, loginAsAdmin, sidebar } from "./fixtures";

test.describe("Admin Flow", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([COOKIE_CONSENT]);
    await loginAsAdmin(page);
  });

  test("should display admin dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/dashboard admin/i)).toBeVisible();
  });

  test("should navigate to clients", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /clienti/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/clienti/);
  });

  test("should navigate to courses", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /corsi/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/corsi/);
  });

  test("should navigate to teachers", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /docenti/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/docenti/);
  });

  test("should navigate to export", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /export/i }).first().click();
    await expect(page).toHaveURL(/\/admin\/export/);
  });

  test("should show sidebar sections", async ({ page }) => {
    const nav = sidebar(page);
    await expect(nav.getByText(/menu admin/i)).toBeVisible();
    await expect(nav.getByRole("link", { name: /dashboard/i })).toBeVisible();
  });
});
