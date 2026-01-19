import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@email.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    await expect(page.getByText('Credenziali non valide')).toBeVisible()
  })
})
