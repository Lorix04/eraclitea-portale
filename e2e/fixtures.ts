import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";

export const COOKIE_CONSENT = {
  name: "cookie_consent",
  value: "accepted",
  domain: "localhost",
  path: "/",
};

export const TEST_ADMIN = {
  email: "admin@enteformazione.it",
  password: "admin123",
};

export const TEST_CLIENT = {
  email: "mario@acme.it",
  password: "cliente123",
};

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector('input[type="email"], input[name="email"]');
  await page.locator('input[type="email"], input[name="email"]').fill(email);
  await page.locator('input[type="password"], input[name="password"]').fill(password);
  await page.getByRole("button", { name: /accedi/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15000 });
}

export async function loginAsAdmin(page: Page) {
  await login(page, TEST_ADMIN.email, TEST_ADMIN.password);
  await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
}

export async function loginAsClient(page: Page) {
  await login(page, TEST_CLIENT.email, TEST_CLIENT.password);
}

/** Click a link in the desktop sidebar (first <aside>) to avoid mobile sidebar duplicates */
export function sidebar(page: Page) {
  return page.locator("aside").first();
}

export const test = base.extend<{
  clientPage: Page;
  adminPage: Page;
}>({
  clientPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([COOKIE_CONSENT]);
    const page = await context.newPage();
    await loginAsClient(page);
    await use(page);
    await context.close();
  },
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    await context.addCookies([COOKIE_CONSENT]);
    const page = await context.newPage();
    await loginAsAdmin(page);
    await use(page);
    await context.close();
  },
});

export { expect };
