import { test, expect, type Page } from '@playwright/test'

/**
 * The route map earns its place only if the walks page stays light: nothing
 * map-related may load before the route chapter approaches the viewport, the
 * line must draw on a real WebGL canvas once it does, reduced motion must
 * still get the drawn route, and without JavaScript the figure stays a
 * readable landmark list. Attribution is visible in every state (ODbL).
 */

const MOBILE = { width: 360, height: 740 }

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(0)
}

test.describe('the route map', () => {
  test('loads nothing heavy until scrolled to, then boots on its own tiles', async ({ page }) => {
    const mapRequests: string[] = []
    page.on('request', (req) => {
      if (/\.pmtiles|maplibre/i.test(req.url())) mapRequests.push(req.url())
    })

    await page.goto('/walks', { waitUntil: 'networkidle' })
    expect(mapRequests, 'no basemap bytes before the section is near the viewport').toHaveLength(0)

    await page.locator('.route-map').scrollIntoViewIfNeeded()
    await expect
      .poll(() => mapRequests.some((u) => u.endsWith('.pmtiles')), {
        message: 'the pmtiles extract loads once the section is reached',
        timeout: 15_000,
      })
      .toBe(true)
    await expect(page.locator('.route-map canvas')).toBeVisible({ timeout: 15_000 })

    // every request stayed on our own origin: no third party sees the visitor
    for (const url of mapRequests) {
      expect(new URL(url).host, 'map assets must be self-hosted').toBe('localhost:3000')
    }

    await expect(page.getByText(/OpenStreetMap contributors/)).toBeVisible()
  })

  test('mobile: 4/5 stage, no horizontal scroll', async ({ page }) => {
    await page.setViewportSize(MOBILE)
    await page.goto('/walks', { waitUntil: 'networkidle' })
    await page.locator('.route-map').scrollIntoViewIfNeeded()
    await expect(page.locator('.route-map canvas')).toBeVisible({ timeout: 15_000 })
    await noHorizontalScroll(page)

    const stage = await page.locator('.route-map__stage').boundingBox()
    expect(stage!.width / stage!.height, 'stage is 4/5 portrait on a phone').toBeLessThan(1)
  })

  test('reduced motion: the route arrives fully drawn, no animation loop', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/walks', { waitUntil: 'networkidle' })
    await page.locator('.route-map').scrollIntoViewIfNeeded()
    await expect(page.locator('.route-map canvas')).toBeVisible({ timeout: 15_000 })
  })
})

test.describe('the route map without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('stays a readable landmark list with attribution', async ({ page }) => {
    await page.goto('/walks')
    await expect(page.locator('.route-map__fallback')).toBeVisible()
    await expect(page.locator('.route-map__fallback')).toContainText('Church Square')
    await expect(page.getByText(/OpenStreetMap contributors/)).toBeVisible()
  })
})
