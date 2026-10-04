import { test, expect } from '@playwright/test'
import { gotoHydrated } from './helpers/account'

/**
 * The photographer page (W4): built to be sent to a curator on its own.
 * Real numbers or the count row does not render; the copyright plate is on
 * the record. Runs against seeded people: Mads has an essay, frames and an
 * album but has led no walks and facilitated no workshops; Alet has an album
 * and workshops but no essays or frames; Emmanuel has only led walks.
 */

const MADS = '/photographers/mads-norgaard'

test('the roster lists members with real member numbers', async ({ page }) => {
  // the founders are on the roster (set by the phase6 migration); a fresh
  // member is not until they switch it on themselves
  await page.goto('/photographers')
  await expect(page.getByText('Emmanuel Munano')).toBeVisible()
  await expect(page.getByText('Member № 0001')).toBeVisible()
  await expect(page.getByText('Member № 0004')).toBeVisible()
})

test('the header nav holds seven links, the roster among them', async ({ page }) => {
  await page.goto('/')
  const links = page.locator('header nav[aria-label="Main"] a')
  // the programme pair leads, then the call, the people, the record
  await expect(links).toHaveText(['Stories', 'Walks', 'Workshops', 'Photocalls', 'Photographers', 'Archive', 'About'])
  await expect(links.filter({ hasText: 'Photographers' })).toHaveAttribute('href', '/photographers')
})

test('a photographer page: header, honest counts, copyright plate', async ({ page }) => {
  await page.goto(MADS)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mads Nørgaard')
  await expect(page.getByText('Member № 0004')).toBeVisible()

  // real numbers only: essays, frames and an album exist; walks led and
  // workshops facilitated are zero and absent
  const counts = page.getByLabel('Body of work')
  await expect(counts).toContainText('Frames in archive')
  await expect(counts).toContainText(/Albums \d+/)
  await expect(counts).not.toContainText('Walks led')
  await expect(counts).not.toContainText('Workshops facilitated')

  await expect(page.getByText(/All work © Mads Nørgaard/)).toBeVisible()

  // essays first: the demo essay links into the reader. Generous timeout:
  // in CI the reader route SSR-compiles on first hit and can exceed 5s.
  await page.getByRole('link', { name: /Demo: the reader test essay/ }).click()
  await expect(page).toHaveURL(/\/stories\/demo-reader-essay/, { timeout: 20_000 })
})

test('the newest frames: uncropped, credited, through ipx, and each one opens', async ({ page }) => {
  // hydrated, not network-idle: a click before hydration takes the link's
  // own target (the larger rendition in a new tab) instead of the viewer,
  // and twelve cold ipx encodes can keep the network busy past the timeout
  await gotoHydrated(page, MADS)
  // named for what it is until a member's own selection exists
  await expect(page.getByRole('heading', { name: /^Newest frames/ })).toBeVisible()
  await expect(page.getByText('Selected frames')).toHaveCount(0)

  const cells = page.locator('.run figure')
  const count = await cells.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i += 1) {
    await expect(cells.nth(i).locator('.b-credit')).toHaveText(/.+/)
    // without JS the link is the larger rendition, through ipx, relative source
    await expect(cells.nth(i).locator('a.open')).toHaveAttribute('href', /^\/_ipx\/[^:]*\/api\/media\//)
  }

  // never cropped: the rendered ratio is the file's own
  const first = cells.first().locator('img')
  await first.scrollIntoViewIfNeeded()
  await expect.poll(() => first.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  const ratios = await first.evaluate((img: HTMLImageElement) => ({
    natural: img.naturalWidth / img.naturalHeight,
    rendered: img.clientWidth / img.clientHeight,
  }))
  expect(Math.abs(ratios.natural - ratios.rendered)).toBeLessThan(0.02)

  // NuxtPicture with a candidate per screen key, every one through /_ipx/
  const srcsets = await page.$$eval('.run picture source[srcset]', (els) =>
    els.map((el) => el.getAttribute('srcset') ?? ''),
  )
  expect(srcsets.length).toBeGreaterThan(0)
  for (const srcset of srcsets) {
    expect(srcset).toMatch(/\/_ipx\//)
    expect(srcset).not.toMatch(/\/_ipx\/[^ ]*https?:\/\//)
  }

  // a frame opens in the viewer: seen whole, the credit still under it
  const viewer = page.locator('dialog.viewer')
  await expect(viewer).toBeHidden()
  await cells.first().locator('a.open').click()
  await expect(viewer).toBeVisible()
  await expect(viewer.locator('img')).toBeVisible()
  await expect(viewer.locator('img')).toHaveAttribute('src', /\/_ipx\//)
  const credit = (await cells.first().locator('.b-credit').textContent()) ?? ''
  await expect(viewer.locator('.b-credit')).toHaveText(credit)
  await expect(viewer.locator('figcaption')).toContainText(/01 \/ \d{2}/)

  if (count > 1) {
    await page.keyboard.press('ArrowRight')
    await expect(viewer.locator('figcaption')).toContainText(/02 \/ \d{2}/)
  }
  await page.keyboard.press('Escape')
  await expect(viewer).toBeHidden()
})

test("the albums section lists the member's own albums, each a door to the album", async ({ page }) => {
  await page.goto(MADS)
  await expect(page.getByRole('heading', { name: /^Albums/ })).toBeVisible()
  const album = page.locator('main a[href="/albums/demo-behind-the-walk"]')
  await expect(album).toBeVisible()
  await expect(album).toContainText('Demo: behind the walk')
  await expect(album).toContainText(/3 photographs/)
  await expect(album.locator('.b-credit')).toHaveText(/Mads Nørgaard/)
  // another member's gallery from the same walk is not listed here
  await expect(page.locator('main a[href="/albums/demo-snapshots-second-gallery"]')).toHaveCount(0)
  // no workshops facilitated, so no workshops chapter
  await expect(page.getByRole('heading', { name: /^Workshops facilitated/ })).toHaveCount(0)

  await album.click()
  await expect(page).toHaveURL(/\/albums\/demo-behind-the-walk/, { timeout: 20_000 })
})

test('workshops facilitated are counted and listed with links', async ({ page }) => {
  // Alet on purpose: the seed never credits frames or essays to her, but she
  // facilitates the demo workshops and has the workshop album.
  await page.goto('/photographers/alet-pretorius')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Alet Pretorius')

  const counts = page.getByLabel('Body of work')
  await expect(counts).toContainText(/Albums \d+/)
  await expect(counts).toContainText(/Workshops facilitated \d+/)
  await expect(counts).not.toContainText('Essays')
  await expect(counts).not.toContainText('Frames in archive')

  await expect(page.getByRole('heading', { name: /^Essays/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^Newest frames/ })).toHaveCount(0)

  await expect(page.getByRole('heading', { name: /^Workshops facilitated/ })).toBeVisible()
  await expect(page.locator('main a[href="/workshops/demo-past-workshop"]')).toContainText(
    'Demo: the workshop that was',
  )
  await expect(page.locator('main a[href="/workshops/demo-next-workshop"]')).toBeVisible()
  await expect(page.locator('main a[href="/albums/demo-workshop-album"]')).toBeVisible()
})

test('a person with no albums or workshops shows neither chapter nor count', async ({ page }) => {
  // Emmanuel on purpose: the seed gives him walks to lead and nothing else.
  await page.goto('/photographers/emmanuel-munano')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Emmanuel Munano')
  const counts = page.getByLabel('Body of work')
  await expect(counts).toContainText('Walks led')
  await expect(counts).not.toContainText('Albums')
  await expect(counts).not.toContainText('Workshops facilitated')
  await expect(page.getByRole('heading', { name: /^Albums/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^Workshops facilitated/ })).toHaveCount(0)
})
