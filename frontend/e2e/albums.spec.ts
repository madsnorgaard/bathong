import { test, expect } from '@playwright/test'

/**
 * Albums: the softer record of a walk, plain media, still credited on every
 * photograph, still served through ipx. Runs against the SEED_DEMO album
 * `demo-behind-the-walk` (three photographs, linked to `demo-past-walk`).
 */

const ALBUM = '/albums/demo-behind-the-walk'

test('the albums index lists the demo album, credited', async ({ page }) => {
  await page.goto('/albums')
  await expect(page.getByRole('heading', { name: /^Albums/ })).toBeVisible()
  const card = page.locator(`a[href="${ALBUM}"]`)
  await expect(card).toBeVisible()
  await expect(card.locator('.b-credit')).toHaveText(/Mads Nørgaard/)
  await expect(card).toContainText(/3 photographs/)
})

test('an album: every photograph credited, uncropped, through ipx, with the walk as a door', async ({ page }) => {
  await page.goto(ALBUM, { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo: behind the walk')
  await expect(page.getByText(/Photographs ©/)).toBeVisible()

  const cells = page.locator('.run figure')
  await expect(cells).toHaveCount(3)
  for (let i = 0; i < 3; i += 1) {
    await expect(cells.nth(i).locator('.b-credit')).toHaveText(/Mads Nørgaard/)
    await expect(cells.nth(i).locator('figcaption')).toContainText(`0${i + 1} / 03`)
  }

  // never cropped: the rendered ratio is the file's own
  const first = cells.first().locator('img')
  await first.scrollIntoViewIfNeeded()
  const ratios = await first.evaluate((img: HTMLImageElement) => ({
    natural: img.naturalWidth / img.naturalHeight,
    rendered: img.clientWidth / img.clientHeight,
  }))
  expect(Math.abs(ratios.natural - ratios.rendered)).toBeLessThan(0.02)

  // the ipx guard from the smoke suite: relative sources, every one through /_ipx/
  const urls = await page.$$eval('.run img[src], .run picture source[srcset]', (els) =>
    els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
  )
  const imageUrls = urls.filter((u) => u.includes('/api/media/') || u.includes('/_ipx/'))
  expect(imageUrls.length).toBeGreaterThan(0)
  for (const u of imageUrls) {
    expect(u).toMatch(/\/_ipx\//)
    expect(u).not.toMatch(/\/_ipx\/[^ ]*https?:\/\//)
  }

  await expect(page.getByRole('link', { name: /From walk № \d{3}/ })).toHaveAttribute(
    'href',
    '/walks/demo-past-walk',
  )
})

test('an album shares its generated C6 card', async ({ page }) => {
  await page.goto(ALBUM)
  const og = page.locator('meta[property="og:image"]')
  await expect(og).toHaveCount(1)
  expect(await og.getAttribute('content')).toMatch(/\/share\/album\/demo-behind-the-walk\.jpg\?v=\d+$/)
  await expect(page.locator('meta[name="copyright"]')).toHaveAttribute('content', /© Mads Nørgaard/)
})

test('an unknown album is a 404', async ({ page }) => {
  const res = await page.goto('/albums/does-not-exist')
  expect(res?.status()).toBe(404)
})
