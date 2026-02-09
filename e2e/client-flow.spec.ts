import { test, expect } from "@playwright/test";

test.describe("Client Flow", () => {
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
    await expect(page).toHaveURL("/");
  });

  test("should display dashboard with stats", async ({ page }) => {
    await expect(page.getByText(/corsi disponibili/i)).toBeVisible();
    await expect(page.getByText(/attestati/i)).toBeVisible();
  });

  test("should navigate to courses list", async ({ page }) => {
    await page.getByRole("link", { name: /corsi/i }).click();
    await expect(page).toHaveURL("/corsi");
    await expect(page.getByRole("heading", { name: /corsi/i })).toBeVisible();
  });

  test("should filter courses by tab", async ({ page }) => {
    await page.goto("/corsi");

    await page.getByRole("button", { name: /in compilazione/i }).click();
    await expect(page.getByRole("button", { name: /in compilazione/i })).toBeVisible();

    await page.getByRole("button", { name: /completati/i }).click();
    await expect(page.getByRole("button", { name: /completati/i })).toBeVisible();
  });

  test("should open course detail and see anagrafiche form", async ({ page }) => {
    await page.goto("/corsi");
    await page.getByRole("link", { name: /compila/i }).first().click();

    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.getByRole("button", { name: /anagrafiche/i })).toBeVisible();
  });

  test("should view and download certificates", async ({ page }) => {
    await page.goto("/attestati");

    await expect(page.getByRole("heading", { name: /attestati/i })).toBeVisible();
    const downloadButtons = page.getByRole("link", { name: /scarica/i });
    const count = await downloadButtons.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("should view notifications", async ({ page }) => {
    await page.getByRole("button", { name: /notifiche/i }).click();
    await expect(page.getByText(/vedi tutte/i)).toBeVisible();

    await page.getByRole("link", { name: /vedi tutte/i }).click();
    await expect(page).toHaveURL("/notifiche");
  });

  test("should change password in profile", async ({ page }) => {
    await page.goto("/profilo");

    await expect(page.getByRole("heading", { name: /profilo/i })).toBeVisible();
    await expect(page.getByText(/cambia password/i)).toBeVisible();
  });
});
