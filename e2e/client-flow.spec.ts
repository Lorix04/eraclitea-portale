import { test, expect } from "@playwright/test";
import { COOKIE_CONSENT, loginAsClient, sidebar } from "./fixtures";

test.describe("Client Flow", () => {
  test.beforeEach(async ({ context, page }) => {
    await context.addCookies([COOKIE_CONSENT]);
    await loginAsClient(page);
  });

  test("should display client dashboard", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator("main")).toBeVisible();
  });

  test("should navigate to courses", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /corsi/i }).first().click();
    await expect(page).toHaveURL(/\/corsi/);
  });

  test("should navigate to employees", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /dipendenti/i }).first().click();
    await expect(page).toHaveURL(/\/dipendenti/);
  });

  test("should navigate to certificates", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /attestati/i }).first().click();
    await expect(page).toHaveURL(/\/attestati/);
  });

  test("should navigate to profile", async ({ page }) => {
    await sidebar(page).getByRole("link", { name: /profilo/i }).first().click();
    await expect(page).toHaveURL(/\/profilo/);
  });

  test("should show client sidebar items", async ({ page }) => {
    const nav = sidebar(page);
    await expect(nav.getByRole("link", { name: /dashboard/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /corsi/i }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: /dipendenti/i }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: /attestati/i }).first()).toBeVisible();
  });
});
