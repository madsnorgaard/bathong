import { test, expect } from '@playwright/test'

/**
 * A walk's own page. Walked, it is the record: the facts, the route as it
 * was, and every door onward (essays, frames, albums). Upcoming, it is the
 * event with the RSVP. Runs against the SEED_DEMO walks: `demo-past-walk`
 * carries the demo essay, two frames and the demo album; `demo-next-walk`
 * is open with a route.
 */

const PAST = '/walks/demo-past-walk'

test('a walked walk is the record: facts, leader, route, and the work it produced', async ({ page }) => {
  await page.goto(PAST)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo: the walk that was')
  await expect(page.getByText(/№ \d{3} · walked/)).toBeVisible()
  await expect(page.getByText('Church Square, Pretoria').first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Emmanuel Munano' })).toHaveAttribute(
    'href',
    '/photographers/emmanuel-munano',
  )
  await expect(page.locator('.route-map')).toBeVisible()

  // essays: the demo essay is a door into the reader
  await expect(page.getByRole('heading', { name: /^Essays/ })).toBeVisible()
  await expect(page.getByRole('link', { name: /Demo: the reader test essay/ })).toHaveAttribute(
    'href',
    '/stories/demo-reader-essay',
  )

  // frames: the contact sheet, every cell credited, the archive as the door
  const cells = page.locator('.sheet-cell')
  await expect(cells).toHaveCount(2)
  for (let i = 0; i < 2; i += 1) await expect(cells.nth(i).locator('.b-credit')).toHaveText(/.+/)
  await expect(page.getByRole('link', { name: /All frames from this walk/ })).toHaveAttribute(
    'href',
    '/archive?walk=demo-past-walk',
  )

  // albums lead the record; the route comes after the work
  const albumLink = page.getByRole('link', { name: /Demo: behind the walk/ })
  await expect(albumLink).toHaveAttribute('href', '/albums/demo-behind-the-walk')
  const albumY = (await albumLink.boundingBox())!.y
  const routeY = (await page.locator('.route-map').boundingBox())!.y
  expect(albumY, 'the album sits above the route').toBeLessThan(routeY)
})

test('the record shares its own C4 card', async ({ page }) => {
  await page.goto(PAST)
  const og = page.locator('meta[property="og:image"]')
  await expect(og).toHaveCount(1)
  expect(await og.getAttribute('content')).toMatch(/\/share\/walk\/demo-past-walk\.jpg\?v=\d+$/)
})

test('an upcoming walk is the event: the plate, the route and the RSVP', async ({ page }) => {
  await page.goto('/walks/demo-next-walk', { waitUntil: 'networkidle' })
  await expect(page.locator('.event')).toBeVisible()
  await expect(page.getByText(/Next walk · № \d{3}/)).toBeVisible()
  await expect(page.locator('.route-map')).toBeVisible()
  await expect(page.locator('#rsvp')).toBeVisible()
  await expect(page.getByLabel(/^Name/)).toBeVisible()
})

test('an unknown walk is a 404, not a blank page', async ({ page }) => {
  const res = await page.goto('/walks/does-not-exist')
  expect(res?.status()).toBe(404)
})

test('the walks index rows are doors to the walk pages', async ({ page }) => {
  await page.goto('/walks')
  await expect(page.locator('a[href="/walks/demo-past-walk"]').first()).toBeVisible()
  await expect(page.locator('a[href="/walks/demo-past-walk"]').first()).toContainText(/\d+ essays?/)
  await expect(page.getByRole('link', { name: /Albums from the walks/ })).toHaveAttribute('href', '/albums')
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('the record still reads, with the route as a landmark list', async ({ page }) => {
    await page.goto(PAST)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo: the walk that was')
    await expect(page.locator('.route-map__fallback')).toContainText('Church Square')
    await expect(page.getByRole('link', { name: /Demo: the reader test essay/ })).toBeVisible()
  })
})
