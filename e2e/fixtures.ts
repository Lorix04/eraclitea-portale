import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{
  clientPage: Page;
  adminPage: Page;
}>({
  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.getByLabel(/email/i).fill("mario@acme.it");
    await page.getByLabel(/password/i).fill("cliente123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await page.waitForURL("/");

    await use(page);
    await context.close();
  },
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("/login");
    await page.getByLabel(/email/i).fill("admin@enteformazione.it");
    await page.getByLabel(/password/i).fill("admin123");
    await page.getByRole("button", { name: /accedi/i }).click();
    await page.waitForURL("/admin");

    await use(page);
    await context.close();
  },
});

export { expect };
