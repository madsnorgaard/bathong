import { test, expect, type APIRequestContext } from '@playwright/test'
import sharp from 'sharp'
import { gotoHydrated } from './helpers/account'

/**
 * Exhibitions: the wall. Runs against the SEED_DEMO exhibition
 * `demo-first-hang`: on now (relative dates), the six demo frames all
 * credited to Mads, no hero image (so the first frame leads the page and the
 * card), linked to the demo essay. Hydration is waited for where a test
 * clicks; never network idle, the pages are image heavy.
 */

const SLUG = 'demo-first-hang'
const EXHIBITION = `/exhibitions/${SLUG}`
const TITLE = 'Demo: the first hang'
const MADS = '/photographers/mads-norgaard'
// "Sunday 27 September 2026" then "to Sunday 25 October 2026": the line break carries no
// space, and some ICU versions put a comma after the weekday
const DATE_RANGE = /\w+day,? \d{1,2} \w+ \d{4}\s*to \w+day,? \d{1,2} \w+ \d{4}/

// The first render of a card loads fonts, fetches the photo from the CMS and
// runs satori + resvg; under a full parallel run that can pass 30s.
test.describe.configure({ timeout: 60_000 })

/** A card the renderer made itself, not the fallback wearing its URL (see share-cards.spec.ts). */
async function expectGeneratedCard(request: APIRequestContext, path: string) {
  const res = await request.get(path)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/jpeg')
  const body = await res.body()
  expect(body.length).toBeLessThanOrEqual(300 * 1024)
  const meta = await sharp(body).metadata()
  expect(meta.width).toBe(1200)
  expect(meta.height).toBe(630)
  const defaultCard = await (await request.get('/share/default.jpg')).body()
  expect(body.equals(defaultCard), `${path} fell back to the default card`).toBe(false)
}

/** Every image source under `scope` rides /_ipx/ with a relative source. */
async function expectThroughIpx(page: import('@playwright/test').Page, scope: string) {
  const urls = await page.$$eval(`${scope} img[src], ${scope} picture source[srcset]`, (els) =>
    els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
  )
  const imageUrls = urls.filter((u) => u.includes('/api/media/') || u.includes('/_ipx/'))
  expect(imageUrls.length).toBeGreaterThan(0)
  for (const u of imageUrls) {
    expect(u).toMatch(/\/_ipx\//)
    expect(u).not.toMatch(/\/_ipx\/[^ ]*https?:\/\//)
  }
}

test('the exhibitions index lists the demo exhibition: on now, venue, dates, a credited photograph', async ({ page }) => {
  await page.goto('/exhibitions')
  await expect(page.getByRole('heading', { name: /^Exhibitions/ })).toBeVisible()
  // something is published, so the empty wall is not shown
  await expect(page.getByText('Nothing is on the wall yet')).toHaveCount(0)

  const feature = page.locator(`main a[href="${EXHIBITION}"]`)
  await expect(feature).toHaveCount(1)
  await expect(feature).toBeVisible()
  await expect(feature.getByRole('heading')).toHaveText(TITLE)
  await expect(feature.locator('.b-tag')).toHaveText('On now')
  await expect(feature).toContainText('Demo venue, Pretoria')
  await expect(feature).toContainText(DATE_RANGE)
  // the first frame leads, with its maker's name
  await expect(feature.locator('.b-credit')).toHaveText(/Mads Nørgaard/)
  await expect(feature.locator('img')).toHaveAttribute('src', /\/_ipx\//)
  await expectThroughIpx(page, 'main')
})

test('an exhibition: frames uncropped and credited through ipx, venue, dates, partners, the essay as a door', async ({ page }) => {
  await gotoHydrated(page, EXHIBITION)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE)
  await expect(page.getByText('Exhibition · On now')).toBeVisible()
  await expect(page.getByText(/Photographs ©/).getByRole('link', { name: 'Mads Nørgaard' })).toHaveAttribute(
    'href',
    MADS,
  )

  // on now: the plate carries the dates and the venue, the words and the partner line on paper
  const plate = page.getByLabel('When and where')
  await expect(plate.locator('.b-tag')).toHaveText('On now')
  await expect(plate).toContainText(DATE_RANGE)
  await expect(plate).toContainText('Demo venue, Pretoria')
  await expect(plate).toContainText('Six demo frames standing in for the first exhibition.')
  await expect(plate).toContainText('Demo partner line. TBC.')

  // the wall: six frames, each with its maker's name under it. No hero
  // image, so the first frame opens the page and the other five follow in
  // the run; no frame is shown twice.
  const cells = page.locator('main figure.frame')
  await expect(cells).toHaveCount(6)
  await expect(page.locator('main figure.lead.frame')).toHaveCount(1)
  await expect(page.locator('.run figure.frame')).toHaveCount(5)
  for (let i = 0; i < 6; i += 1) {
    await expect(cells.nth(i).locator('.b-credit')).toHaveText(/Mads Nørgaard/)
    // each opens its larger rendition, through ipx, relative source
    await expect(cells.nth(i).locator('a.open')).toHaveAttribute('href', /^\/_ipx\/[^:]*\/api\/media\//)
  }
  const sources = await cells.evaluateAll((figures) => figures.map((f) => f.querySelector('img')?.getAttribute('src')))
  expect(new Set(sources).size).toBe(6)

  // never cropped: the rendered ratio is the file's own, in the opening
  // slot and in the run
  for (const cell of [cells.first(), cells.nth(1)]) {
    const img = cell.locator('img')
    await img.scrollIntoViewIfNeeded()
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0)
    const ratios = await img.evaluate((el: HTMLImageElement) => ({
      natural: el.naturalWidth / el.naturalHeight,
      rendered: el.clientWidth / el.clientHeight,
    }))
    expect(Math.abs(ratios.natural - ratios.rendered)).toBeLessThan(0.02)
  }

  await expectThroughIpx(page, 'main')

  // the essay the frames came out of is a door into the reader
  await expect(page.getByRole('heading', { name: /^The essays/ })).toBeVisible()
  const essay = page.locator('main a[href="/stories/demo-reader-essay"]')
  await expect(essay).toContainText('Demo: the reader test essay')
  await expect(essay.locator('.b-credit')).toHaveText(/Mads Nørgaard/)
  await essay.click()
  await expect(page).toHaveURL(/\/stories\/demo-reader-essay/, { timeout: 20_000 })
})

test('an exhibition shares its generated card, led by its first frame', async ({ page, request }) => {
  await page.goto(EXHIBITION)
  const og = page.locator('meta[property="og:image"]')
  await expect(og).toHaveCount(1)
  expect(await og.getAttribute('content')).toMatch(
    new RegExp(`/share/exhibition/${SLUG}\\.jpg\\?v=\\d+&c=\\d+$`),
  )
  // one photographer on the wall, so the copyright line names them
  await expect(page.locator('meta[name="copyright"]')).toHaveAttribute('content', /© Mads Nørgaard/)
  await expectGeneratedCard(request, `/share/exhibition/${SLUG}.jpg`)
})

test('the exhibitions index shares its own photograph card', async ({ page, request }) => {
  await page.goto('/exhibitions')
  const content = await page.locator('meta[property="og:image"]').getAttribute('content')
  expect(content).toMatch(/\/share\/exhibitions\.jpg\?v=\d+&c=\d+$/)
  await expectGeneratedCard(request, '/share/exhibitions.jpg')
})

test('a photographer page lists the exhibitions that hang their frames', async ({ page }) => {
  await gotoHydrated(page, MADS)
  await expect(page.getByLabel('Body of work')).toContainText(/Exhibitions \d+/)
  await expect(page.getByRole('heading', { name: /^Exhibitions/ })).toBeVisible()
  const row = page.locator('main li', { has: page.locator(`a[href="${EXHIBITION}"]`) })
  await expect(row).toContainText(TITLE)
  await expect(row).toContainText('On now')
  await expect(row).toContainText('6 frames')
  await expect(row).toContainText('Demo venue, Pretoria')

  await row.locator('a').click()
  await expect(page).toHaveURL(new RegExp(`${EXHIBITION}$`), { timeout: 20_000 })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLE)
})

test('a photographer with no frames on a wall shows neither the chapter nor the count', async ({ page }) => {
  // Emmanuel on purpose: the seed gives him walks to lead and no frames.
  await page.goto('/photographers/emmanuel-munano')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Emmanuel Munano')
  await expect(page.getByLabel('Body of work')).not.toContainText('Exhibitions')
  await expect(page.getByRole('heading', { name: /^Exhibitions/ })).toHaveCount(0)
})

test('Exhibitions lives in the footer, not in the header', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('footer nav[aria-label="Site"] a', { hasText: 'Exhibitions' })).toHaveAttribute(
    'href',
    '/exhibitions',
  )
  const main = page.locator('header nav[aria-label="Main"] a')
  await expect(main).toHaveCount(7)
  await expect(main.filter({ hasText: 'Exhibitions' })).toHaveCount(0)
})

test('an unknown exhibition is a 404, and its card is the default', async ({ page, request }) => {
  const res = await page.goto('/exhibitions/does-not-exist')
  expect(res?.status()).toBe(404)
  const fallback = await (await request.get('/share/exhibition/does-not-exist.jpg')).body()
  const defaultCard = await (await request.get('/share/default.jpg')).body()
  expect(fallback.equals(defaultCard)).toBe(true)
})
