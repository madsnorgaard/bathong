import { test, expect } from '@playwright/test'

/**
 * The essay reader's contract (W2): reader chrome not site chrome, the
 * counter doubles as the progress rule, frames sit whole in the viewport
 * (82vh cap, never cropped), keyboard and tap advance, the end is a door.
 * Runs against the SEED_DEMO essay.
 */

const READER = '/stories/demo-reader-essay'

test('reader chrome: wordmark, live counter, progress rule, close to stories', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  await expect(page.locator('.chrome .counter')).toHaveText('01 / 06')
  await expect(page.getByRole('progressbar')).toBeVisible()

  // no site chrome in the reader
  await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)

  await page.getByRole('link', { name: /Close the essay/ }).click()
  await expect(page).toHaveURL(/\/stories$/)
})

test('exactly one og:image, article type, from the lead frame og rendition', async ({ page }) => {
  await page.goto(READER)
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1)
  await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article')
})

test('a non-bleed frame sits whole in the viewport: capped at 82vh, never cropped', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  const frame = page.locator('[data-frame-index="2"] img')
  await frame.scrollIntoViewIfNeeded()
  await expect(frame).toBeVisible()
  const box = await frame.boundingBox()
  const viewport = page.viewportSize()!
  expect(box!.height).toBeLessThanOrEqual(viewport.height * 0.82 + 2)

  // never cropped: rendered ratio matches the file's natural ratio
  const ratios = await frame.evaluate((img: HTMLImageElement) => ({
    natural: img.naturalWidth / img.naturalHeight,
    rendered: img.clientWidth / img.clientHeight,
  }))
  expect(Math.abs(ratios.natural - ratios.rendered)).toBeLessThan(0.02)
})

test('keyboard advances the sequence and the counter follows', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  const counter = page.locator('.chrome .counter')
  await expect(counter).toHaveText('01 / 06')
  await page.keyboard.press('ArrowRight')
  await expect(counter).toHaveText('02 / 06', { timeout: 5000 })
  await page.keyboard.press('ArrowLeft')
  await expect(counter).toHaveText('01 / 06', { timeout: 5000 })
})

test('the pair renders side by side on desktop', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  const left = await page.locator('[data-frame-index="3"]').boundingBox()
  const right = await page.locator('[data-frame-index="4"]').boundingBox()
  expect(Math.abs(left!.y - right!.y), 'paired frames share a row').toBeLessThan(10)
  expect(right!.x).toBeGreaterThan(left!.x)
})

test('the end is a door, never a grid: credit and one onward link', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  const door = page.locator('.door')
  await door.scrollIntoViewIfNeeded()
  await expect(door.getByText('Mads Nørgaard')).toBeVisible()
  const onward = door.getByRole('link')
  const count = await onward.count()
  expect(count).toBeGreaterThanOrEqual(1)
  // photographer, the walk it came from, the next essay: still a door
  expect(count, 'a door, not a grid').toBeLessThanOrEqual(3)
  await expect(door.locator('img')).toHaveCount(0)
  await expect(door.getByRole('link', { name: /From walk № \d{3}, .+ →/ })).toHaveAttribute(
    'href',
    '/walks/demo-past-walk',
  )
})

test('the share row sits on ink before the door, in the voice', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  const row = page.getByRole('navigation', { name: 'Share' })
  await expect(row).toBeVisible()
  await expect(page.locator('.door').getByRole('navigation', { name: 'Share' })).toHaveCount(0)
})

test('every frame in the reader carries its credit capsule', async ({ page }) => {
  await page.goto(READER, { waitUntil: 'networkidle' })
  const frames = page.locator('[data-frame-index]')
  const capsules = page.locator('[data-frame-index] .b-credit, .pair-half .b-credit')
  expect(await capsules.count()).toBeGreaterThanOrEqual(await frames.count())
})
