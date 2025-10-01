import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility Tests', () => {
  test('planner page should be accessible', async ({ page }) => {
    await page.goto('/planner')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('my shifts page should be accessible', async ({ page }) => {
    await page.goto('/my-shifts')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('admin dashboard should be accessible', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('kiosk should be accessible', async ({ page }) => {
    await page.goto('/kiosk/location-test')
    await page.waitForLoadState('networkidle')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('keyboard navigation should work on planner', async ({ page }) => {
    await page.goto('/planner')
    
    // Tab through interactive elements
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
    
    await page.keyboard.press('Tab')
    await expect(page.locator(':focus')).toBeVisible()
  })

  test('skip link should work', async ({ page }) => {
    await page.goto('/')
    
    await page.keyboard.press('Tab')
    const skipLink = page.locator('[data-testid="skip-to-main"]')
    
    if ((await skipLink.count()) > 0) {
      await expect(skipLink).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(page.locator('main')).toBeFocused()
    }
  })
})
