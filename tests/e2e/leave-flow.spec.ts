import { test, expect } from '@playwright/test'

test.describe('Leave Management Flow', () => {
  test('employee requests leave → manager approves', async ({ page }) => {
    // Employee submits request
    await page.goto('/login')
    await page.fill('input[type="email"]', 'user@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await page.goto('/my-shifts')
    await page.click('[data-testid="leave-tab"]')
    await page.click('[data-testid="request-leave-btn"]')
    
    await page.selectOption('[name="type_id"]', { index: 0 })
    await page.fill('[name="start_at"]', '2024-04-10')
    await page.fill('[name="end_at"]', '2024-04-15')
    await page.fill('[name="reason"]', 'E2E Test Leave')
    
    await page.click('[data-testid="submit-leave-btn"]')
    await expect(page.locator('.sonner')).toContainText(/submitted/i)
    
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-btn"]')
    
    // Manager approves
    await page.goto('/login')
    await page.fill('input[type="email"]', 'manager@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await page.goto('/admin/leave/inbox')
    
    const pendingRequest = page.locator('[data-testid^="leave-request-"][data-status="pending"]').first()
    await pendingRequest.click()
    
    await page.click('[data-testid="approve-leave-btn"]')
    await expect(page.locator('.sonner')).toContainText(/approved/i)
  })

  test('manager rejects leave request with reason', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'manager@test.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    await page.goto('/admin/leave/inbox')
    
    const pendingRequest = page.locator('[data-testid^="leave-request-"][data-status="pending"]').first()
    
    if ((await pendingRequest.count()) > 0) {
      await pendingRequest.click()
      
      await page.click('[data-testid="reject-leave-btn"]')
      await page.fill('[name="rejection_notes"]', 'Insufficient coverage for that period')
      await page.click('[data-testid="confirm-reject-btn"]')
      
      await expect(page.locator('.sonner')).toContainText(/rejected/i)
    }
  })
})
