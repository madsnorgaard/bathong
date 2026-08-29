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
  // The narrowed shelf arrives after the URL changes: poll until every
  // credit on the page is the chosen photographer, rather than counting
  // the unfiltered shelf and asserting on a list that shrinks underneath.
  const credits = page.locator('.credit')
  await expect
    .poll(async () => {
      const texts = await credits.allTextContents()
      return texts.length > 0 && texts.every((t) => t.includes(name))
    })
    .toBe(true)
})

test('a walk filter narrows the shelf to the frames made on that walk', async ({ page }) => {
  await page.goto('/archive?walk=demo-past-walk')
  await expect(page.locator('.count')).toContainText('2 frames')
  await expect(page.locator('nav[aria-label="Filter by walk"] a.active')).toContainText(/№ \d{3}/)
  const walkLinks = page.locator('.cell a[href="/walks/demo-past-walk"]')
  await expect(walkLinks).toHaveCount(2)

  await page.goto('/archive?walk=no-such-walk')
  await expect(page.getByText(/Nothing under that yet/)).toBeVisible()
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
