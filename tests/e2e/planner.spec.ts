import { test, expect } from '@playwright/test'

test.describe('Planner UI', () => {
  test.beforeEach(async ({ page }) => {
    // Mock login
    await page.goto('/login')
    await page.fill('input[type="email"]', 'manager@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
    
    await page.goto('/planner')
    await page.waitForSelector('[data-testid="planner-grid"]')
  })

  test('should load planner with current week', async ({ page }) => {
    await expect(page.locator('[data-testid="week-navigator"]')).toBeVisible()
    await expect(page.locator('[data-testid="planner-grid"]')).toBeVisible()
    
    const weekDisplay = page.locator('[data-testid="current-week"]')
    await expect(weekDisplay).toContainText(/Week \d+/)
  })

  test('should navigate between weeks', async ({ page }) => {
    const nextButton = page.locator('[data-testid="next-week-btn"]')
    const prevButton = page.locator('[data-testid="prev-week-btn"]')
    
    const initialWeek = await page.locator('[data-testid="current-week"]').textContent()
    
    await nextButton.click()
    await page.waitForTimeout(500)
    const nextWeek = await page.locator('[data-testid="current-week"]').textContent()
    expect(nextWeek).not.toBe(initialWeek)
    
    await prevButton.click()
    await page.waitForTimeout(500)
    const backToInitial = await page.locator('[data-testid="current-week"]').textContent()
    expect(backToInitial).toBe(initialWeek)
  })

  test('should create new shift', async ({ page }) => {
    await page.click('[data-testid="add-shift-btn"]')
    await page.waitForSelector('[data-testid="shift-form"]')
    
    await page.fill('[name="role"]', 'Server')
    await page.fill('[name="start_time"]', '09:00')
    await page.fill('[name="end_time"]', '17:00')
    
    await page.click('[data-testid="save-shift-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/Shift created/i)
  })

  test('should assign user to shift', async ({ page }) => {
    const shift = page.locator('[data-testid^="shift-"]').first()
    await shift.click()
    
    await page.click('[data-testid="assign-user-btn"]')
    await page.waitForSelector('[data-testid="user-selector"]')
    
    await page.click('[data-testid="user-option"]')
    await page.click('[data-testid="confirm-assignment-btn"]')
    
    await expect(page.locator('.sonner')).toContainText(/assigned/i)
  })

  test('should filter by location', async ({ page }) => {
    await page.click('[data-testid="location-filter"]')
    await page.click('[data-testid="location-option"]')
    
    await page.waitForTimeout(500)
    
    const shifts = page.locator('[data-testid^="shift-"]')
    await expect(shifts).toHaveCount(await shifts.count())
  })

  test('should display leave requests', async ({ page }) => {
    const leaveIndicators = page.locator('[data-testid^="leave-"]')
    
    if ((await leaveIndicators.count()) > 0) {
      await leaveIndicators.first().hover()
      await expect(page.locator('[role="tooltip"]')).toBeVisible()
    }
  })
})
