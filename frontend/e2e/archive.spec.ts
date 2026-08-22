import { test, expect } from '@playwright/test'

/**
 * The archive (M6): every frame, credited, filterable by words. Runs against
 * the SEED_DEMO frames (six demo frames credited to one photographer).
 */

test('the archive renders the chapter and credited frames', async ({ page }) => {
  await page.goto('/archive')
  await expect(page.getByRole('heading', { name: /^Archive/ })).toBeVisible()
  const credits = page.locator('.credit')
  await expect(credits.first()).toBeVisible()
  await expect(credits.first()).toContainText('©')
  await expect(page.locator('.count')).toContainText(/\d+ frames?/)
})

test('a photographer filter narrows the shelf and lands in the URL', async ({ page }) => {
  await page.goto('/archive')
  const filter = page.locator('nav[aria-label="Filter by photographer"] a').nth(1)
  const name = (await filter.textContent())?.trim() ?? ''
  await filter.click()
  await expect(page).toHaveURL(/photographer=/)
  await expect(filter).toHaveClass(/active/)
  const credits = page.locator('.credit')
  const n = await credits.count()
  expect(n).toBeGreaterThan(0)
  for (let i = 0; i < n; i += 1) await expect(credits.nth(i)).toContainText(name)
})

test('a search with no match shows the empty state', async ({ page }) => {
  await page.goto('/archive?q=zzzz-no-such-thing')
  await expect(page.getByText(/Nothing under that yet/)).toBeVisible()
  await expect(page.getByRole('link', { name: /Clear the filters/ })).toHaveAttribute('href', '/archive')
})

test('the header nav links to the archive', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('header nav[aria-label="Main"] a', { hasText: 'Archive' }).first()).toHaveAttribute(
    'href',
    '/archive',
  )
})
