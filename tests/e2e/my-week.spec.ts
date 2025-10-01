import { test, expect } from '@playwright/test'

test.describe('My Week (Self-Service)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'user@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.goto('/my-shifts')
  })

  test('should display user shifts for current week', async ({ page }) => {
    await expect(page.locator('[data-testid="my-shifts-list"]')).toBeVisible()
    
    const shifts = page.locator('[data-testid^="my-shift-"]')
    if ((await shifts.count()) > 0) {
      await expect(shifts.first()).toContainText(/\d{2}:\d{2}/)
    }
  })

  test('should submit availability', async ({ page }) => {
    await page.click('[data-testid="availability-tab"]')
    
    await page.click('[data-testid="add-availability-btn"]')
    await page.waitForSelector('[data-testid="availability-form"]')
    
    await page.selectOption('[name="weekday"]', '1') // Monday
    await page.fill('[name="start_time"]', '09:00')
    await page.fill('[name="end_time"]', '17:00')
    await page.selectOption('[name="preference"]', 'preferred')
    
    await page.click('[data-testid="save-availability-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/saved/i)
  })

  test('should request leave', async ({ page }) => {
    await page.click('[data-testid="leave-tab"]')
    
    await page.click('[data-testid="request-leave-btn"]')
    await page.waitForSelector('[data-testid="leave-form"]')
    
    await page.selectOption('[name="type_id"]', { index: 0 })
    await page.fill('[name="start_at"]', '2024-03-01')
    await page.fill('[name="end_at"]', '2024-03-05')
    await page.fill('[name="reason"]', 'Family vacation')
    
    await page.click('[data-testid="submit-leave-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/submitted/i)
  })

  test('should request time correction', async ({ page }) => {
    await page.click('[data-testid="time-correction-btn"]')
    await page.waitForSelector('[data-testid="correction-form"]')
    
    await page.fill('[name="punch_date"]', '2024-02-20')
    await page.fill('[name="actual_time"]', '08:55')
    await page.fill('[name="reason"]', 'Forgot to punch in')
    
    await page.click('[data-testid="submit-correction-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/submitted/i)
  })

  test('should accept shift assignment', async ({ page }) => {
    const pendingShift = page.locator('[data-testid^="my-shift-"][data-status="pending"]').first()
    
    if ((await pendingShift.count()) > 0) {
      await pendingShift.click()
      await page.click('[data-testid="accept-shift-btn"]')
      
      await expect(page.locator('.sonner')).toContainText(/accepted/i)
    }
  })
})
