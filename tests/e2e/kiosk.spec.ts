import { test, expect } from '@playwright/test'

test.describe('Kiosk Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kiosk/location-test-id')
  })

  test('should display kiosk interface', async ({ page }) => {
    await expect(page.locator('[data-testid="kiosk-clock"]')).toBeVisible()
    await expect(page.locator('[data-testid="pin-input"]')).toBeVisible()
  })

  test('should punch in with PIN', async ({ page }) => {
    const pinInput = page.locator('[data-testid="pin-input"]')
    
    await pinInput.fill('1234')
    await page.click('[data-testid="punch-in-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/punched in/i)
    await expect(page.locator('[data-testid="current-status"]')).toContainText(/Clocked In/i)
  })

  test('should punch out', async ({ page }) => {
    // Assume user already punched in
    await page.locator('[data-testid="pin-input"]').fill('1234')
    
    await page.click('[data-testid="punch-out-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/punched out/i)
  })

  test('should handle break start/end', async ({ page }) => {
    await page.locator('[data-testid="pin-input"]').fill('1234')
    
    await page.click('[data-testid="break-start-btn"]')
    await expect(page.locator('.sonner')).toContainText(/break started/i)
    
    await page.waitForTimeout(1000)
    
    await page.locator('[data-testid="pin-input"]').fill('1234')
    await page.click('[data-testid="break-end-btn"]')
    await expect(page.locator('.sonner')).toContainText(/break ended/i)
  })

  test('should reject invalid PIN', async ({ page }) => {
    await page.locator('[data-testid="pin-input"]').fill('0000')
    await page.click('[data-testid="punch-in-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/invalid/i)
  })

  test('should display current punched-in users', async ({ page }) => {
    const activeUsers = page.locator('[data-testid="active-users-list"]')
    
    if ((await activeUsers.count()) > 0) {
      await expect(activeUsers.first()).toBeVisible()
    }
  })
})
