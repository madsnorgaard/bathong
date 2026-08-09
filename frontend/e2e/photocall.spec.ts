import { test, expect } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The photocall flow (W6): the signal plate, the three lines that remove the
 * excuse, and a real anonymous entry with files through the hardened
 * endpoint. Runs against the SEED_DEMO open call.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

test('the page carries the signal plate and the three lines', async ({ page }) => {
  await page.goto('/photocalls')
  await expect(page.locator('.chapter--signal')).toBeVisible()
  await expect(page.getByText('anyone, member or not')).toBeVisible()
  await expect(page.getByText('What it costs')).toBeVisible()
  await expect(page.getByText('What you keep')).toBeVisible()
  await expect(page.getByText(/written response, frame by frame/).first()).toBeVisible()
})

test('an anonymous entry with two frames goes through and confirms in writing', async ({ page }) => {
  await page.goto('/photocalls', { waitUntil: 'networkidle' })

  await page.getByLabel(/^Name/).fill('Playwright Entrant')
  await page.getByLabel(/^Email/).fill(`entry-${Date.now()}@example.org`)
  await page.getByLabel(/Where you shoot/).fill('Mamelodi')
  await page
    .locator('#frames')
    .setInputFiles([path.join(FIXTURES, 'entry-1.jpg'), path.join(FIXTURES, 'entry-2.jpg')])
  await expect(page.getByText(/01 · entry-1\.jpg/)).toBeVisible()
  await page.getByLabel(/I agree to the photocall terms/).check()
  await page.getByRole('button', { name: /Send it/ }).click()

  await expect(page.getByText(/In\. 2 frames received\./)).toBeVisible({ timeout: 20000 })
  await expect(page.getByText(/You keep your copyright/)).toBeVisible()
})

test('the send button stays disabled until the terms are agreed', async ({ page }) => {
  await page.goto('/photocalls', { waitUntil: 'networkidle' })
  await page.getByLabel(/^Name/).fill('No Terms')
  await page.getByLabel(/^Email/).fill('noterms@example.org')
  await page.locator('#frames').setInputFiles([path.join(FIXTURES, 'entry-1.jpg')])
  await expect(page.getByRole('button', { name: /Send it/ })).toBeDisabled()
})
