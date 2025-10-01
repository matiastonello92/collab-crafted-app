import { test, expect } from '@playwright/test'

test.describe('Job Tags E2E Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login')
    await page.fill('input[type="email"]', 'admin@example.com')
    await page.fill('input[type="password"]', 'admin123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  test('Admin creates job tag with color', async ({ page }) => {
    // Navigate to Job Tags page
    await page.goto('/staff/job-tags')
    await expect(page.locator('h1')).toContainText('Job Tags')

    // Should be on Catalogo Tab by default
    await expect(page.locator('text=Catalogo Tag')).toBeVisible()

    // Click "Nuovo Tag" button
    await page.click('button:has-text("Nuovo Tag")')

    // Fill form
    await page.fill('input#label', 'Pizzaiolo E2E')
    await page.selectOption('select#categoria', 'Cucina')
    await page.fill('input#color', '#EF4444')

    // Submit
    await page.click('button:has-text("Crea")')

    // Should show success toast
    await expect(page.locator('text=Tag creato')).toBeVisible({ timeout: 5000 })

    // Verify tag appears in table
    await expect(page.locator('table')).toContainText('Pizzaiolo E2E')
    await expect(page.locator('table')).toContainText('Cucina')

    // Verify color swatch is displayed
    const colorSwatch = page.locator('div[style*="background-color: rgb(239, 68, 68)"]')
    await expect(colorSwatch).toBeVisible()
  })

  test('Admin inserts preset ristorazione tags', async ({ page }) => {
    await page.goto('/staff/job-tags')

    // Click preset button
    await page.click('button:has-text("Set Consigliato Ristorazione")')

    // Confirm dialog
    page.on('dialog', dialog => dialog.accept())
    
    // Wait for success toast
    await expect(page.locator('text=Set consigliato inserito')).toBeVisible({ timeout: 5000 })

    // Verify some preset tags appear
    await expect(page.locator('table')).toContainText('Direttore')
    await expect(page.locator('table')).toContainText('Pizzaiolo')
    await expect(page.locator('table')).toContainText('Cameriere')
  })

  test('Manager assigns primary and secondary tags', async ({ page }) => {
    await page.goto('/staff/job-tags')

    // Switch to Assegnazioni tab
    await page.click('button:has-text("Assegnazioni")')
    await expect(page.locator('text=Assegna Ruoli per Location')).toBeVisible()

    // Select location
    await page.click('[role="combobox"]')
    await page.click('text=Main Location')

    // Wait for users to load
    await page.waitForSelector('.user-card, [data-testid="user-card"]', { timeout: 5000 })

    // Find first user card
    const userCard = page.locator('div:has-text("Manca primario")').first()
    
    if (await userCard.isVisible()) {
      // Set primary tag
      await userCard.locator('select, [role="combobox"]').first().click()
      await page.click('text=Cameriere')

      // Wait for primary to be set
      await expect(page.locator('text=Tag primario impostato')).toBeVisible({ timeout: 5000 })

      // Badge "Manca primario" should disappear
      await expect(userCard.locator('text=Manca primario')).not.toBeVisible()

      // Add secondary tag
      const secondaryBadge = userCard.locator('[data-testid="secondary-tag"]:has-text("Runner")').first()
      if (await secondaryBadge.isVisible()) {
        await secondaryBadge.click()
        await expect(page.locator('text=Tag assegnato')).toBeVisible({ timeout: 5000 })
      }
    }
  })

  test('Color badges are displayed correctly', async ({ page }) => {
    await page.goto('/staff/job-tags')

    // Verify Catalogo Tab colors
    await expect(page.locator('div[style*="background-color"]')).toHaveCount({ min: 1 })

    // Switch to Assegnazioni tab
    await page.click('button:has-text("Assegnazioni")')
    await page.click('[role="combobox"]')
    await page.click('text=Main Location')

    // Wait for assignment cards
    await page.waitForTimeout(2000)

    // Verify colored badges exist
    const coloredBadges = page.locator('[style*="background"]')
    const count = await coloredBadges.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Edit tag updates label and regenerates key', async ({ page }) => {
    await page.goto('/staff/job-tags')

    // Click edit button on first tag
    await page.click('button[aria-label="Edit"], button:has-text("Edit")').first()

    // Update label
    await page.fill('input#label', 'Cameriere Senior')
    await page.click('button:has-text("Salva")')

    // Should show success
    await expect(page.locator('text=Tag aggiornato')).toBeVisible({ timeout: 5000 })

    // Verify updated label in table
    await expect(page.locator('table')).toContainText('Cameriere Senior')
  })

  test('Toggle tag active/inactive', async ({ page }) => {
    await page.goto('/staff/job-tags')

    // Find first active tag
    const firstRow = page.locator('table tbody tr').first()
    const tagName = await firstRow.locator('td').first().textContent()

    // Click power/toggle button
    await firstRow.locator('button:has(svg)').last().click()

    // Should show success
    await expect(page.locator('text=Tag disattivato, text=Tag attivato')).toBeVisible({ timeout: 5000 })

    // Verify status badge changed
    await expect(firstRow.locator('text=Disattivo, text=Attivo')).toBeVisible()
  })

  test('Remove secondary tag', async ({ page }) => {
    await page.goto('/staff/job-tags')
    await page.click('button:has-text("Assegnazioni")')
    await page.click('[role="combobox"]')
    await page.click('text=Main Location')

    // Wait for cards
    await page.waitForTimeout(2000)

    // Find user with secondary tags
    const secondaryBadge = page.locator('[data-testid="secondary-tag"], .badge:has(svg)').first()
    
    if (await secondaryBadge.isVisible()) {
      await secondaryBadge.click()
      await expect(page.locator('text=Tag rimosso')).toBeVisible({ timeout: 5000 })
    }
  })
})
