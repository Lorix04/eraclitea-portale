import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{
  clientPage: Page;
  adminPage: Page;
}>({
  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForSelector('input[type="email"], input[name="email"]');
    await page
      .locator('input[type="email"], input[name="email"]')
      .fill("mario@acme.it");
    await page
      .locator('input[type="password"], input[name="password"]')
      .fill("cliente123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await page.waitForURL("/");

    await use(page);
    await context.close();
  },
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.waitForSelector('input[type="email"], input[name="email"]');
    await page
      .locator('input[type="email"], input[name="email"]')
      .fill("admin@enteformazione.it");
    await page
      .locator('input[type="password"], input[name="password"]')
      .fill("admin123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await page.waitForURL("/admin");

    await use(page);
    await context.close();
  },
});

export { expect };
