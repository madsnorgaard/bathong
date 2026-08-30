import { test, expect } from '@playwright/test'

/**
 * The photographer page (W4): built to be sent to a curator on its own.
 * Real numbers or the count row does not render; the copyright plate is on
 * the record. Runs against seeded people (Mads has essays and frames but has
 * led no walks, so "Walks led" must not appear).
 */

test('the roster lists members with real member numbers', async ({ page }) => {
  // the founders are on the roster (set by the phase6 migration); a fresh
  // member is not until they switch it on themselves
  await page.goto('/photographers')
  await expect(page.getByText('Emmanuel Munano')).toBeVisible()
  await expect(page.getByText('Member № 0001')).toBeVisible()
  await expect(page.getByText('Member № 0004')).toBeVisible()
})

test('a photographer page: header, honest counts, copyright plate', async ({ page }) => {
  await page.goto('/photographers/mads-norgaard')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mads Nørgaard')
  await expect(page.getByText('Member № 0004')).toBeVisible()

  // real numbers only: essays and frames exist, walks led is zero and absent
  const counts = page.getByLabel('Body of work')
  await expect(counts).toContainText('Frames in archive')
  await expect(counts).not.toContainText('Walks led')

  await expect(page.getByText(/All work © Mads Nørgaard/)).toBeVisible()

  // essays first: the demo essay links into the reader. Generous timeout:
  // in CI the reader route SSR-compiles on first hit and can exceed 5s.
  await page.getByRole('link', { name: /Demo: the reader test essay/ }).click()
  await expect(page).toHaveURL(/\/stories\/demo-reader-essay/, { timeout: 20_000 })
})

test('a person with no essays or frames shows no count row', async ({ page }) => {
  // Alet on purpose: the seed never credits frames to her, so this holds
  // against real content too (Jacques has a body of work now).
  await page.goto('/photographers/alet-pretorius')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alet Pretorius')
  await expect(page.getByLabel('Body of work')).toHaveCount(0)
})
