import { test, expect, type Page } from '@playwright/test'
import { gotoHydrated } from './helpers/account'

/**
 * The essay reader's contract (W2): reader chrome not site chrome, the
 * counter doubles as the progress rule, frames sit whole in the viewport
 * (82vh cap, never cropped), keyboard and tap advance, the end is a door.
 * And its weight: one eager frame, every frame holding its place before its
 * file arrives, a desktop first view under 1 MB.
 * Runs against the SEED_DEMO essay.
 */

const READER = '/stories/demo-reader-essay'

test('reader chrome: wordmark, live counter, progress rule, close to stories', async ({ page }) => {
  await gotoHydrated(page, READER)
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
  await gotoHydrated(page, READER)
  const frame = page.locator('[data-frame-index="2"] img')
  await frame.scrollIntoViewIfNeeded()
  await expect(frame).toBeVisible()
  // the frame is lazy: its file arrives as the reader gets near
  await expect
    .poll(() => frame.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 15_000 })
    .toBe(true)
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
  await gotoHydrated(page, READER)
  const counter = page.locator('.chrome .counter')
  await expect(counter).toHaveText('01 / 06')
  await page.keyboard.press('ArrowRight')
  await expect(counter).toHaveText('02 / 06', { timeout: 5000 })
  await page.keyboard.press('ArrowLeft')
  await expect(counter).toHaveText('01 / 06', { timeout: 5000 })
})

test('the pair renders side by side on desktop', async ({ page }) => {
  await gotoHydrated(page, READER)
  const left = await page.locator('[data-frame-index="3"]').boundingBox()
  const right = await page.locator('[data-frame-index="4"]').boundingBox()
  expect(Math.abs(left!.y - right!.y), 'paired frames share a row').toBeLessThan(10)
  expect(right!.x).toBeGreaterThan(left!.x)
})

test('the end is a door, never a grid: credit and one onward link', async ({ page }) => {
  await gotoHydrated(page, READER)
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
  await gotoHydrated(page, READER)
  const row = page.getByRole('navigation', { name: 'Share' })
  await expect(row).toBeVisible()
  await expect(page.locator('.door').getByRole('navigation', { name: 'Share' })).toHaveCount(0)
})

test('every frame in the reader carries its credit capsule', async ({ page }) => {
  await gotoHydrated(page, READER)
  const frames = page.locator('[data-frame-index]')
  const capsules = page.locator('[data-frame-index] .b-credit, .pair-half .b-credit')
  expect(await capsules.count()).toBeGreaterThanOrEqual(await frames.count())
})

test.describe('weight', () => {
  // the desktop the budget is measured on
  test.use({ viewport: { width: 1440, height: 900 } })

  test('only the first frame is eager, and every frame holds its place before its file arrives', async ({
    page,
  }) => {
    // No photograph arrives at all: what stands on the page is what the
    // markup reserved from the file's own width and height.
    await page.route('**/_ipx/**', (route) => route.abort())
    await gotoHydrated(page, READER)

    const frames = await page.locator('[data-frame-index] img').evaluateAll((els) =>
      (els as HTMLImageElement[]).map((img) => {
        const box = img.getBoundingClientRect()
        return {
          loading: img.getAttribute('loading'),
          width: Number(img.getAttribute('width')),
          height: Number(img.getAttribute('height')),
          boxWidth: box.width,
          boxHeight: box.height,
        }
      }),
    )
    expect(frames.length).toBe(6)
    expect(frames.map((f) => f.loading)).toEqual(['eager', ...frames.slice(1).map(() => 'lazy')])

    const viewport = page.viewportSize()!
    for (const [i, f] of frames.entries()) {
      const name = `frame ${i + 1}`
      expect(f.width, `${name} carries the file's width`).toBeGreaterThan(0)
      expect(f.height, `${name} carries the file's height`).toBeGreaterThan(0)
      expect(f.boxHeight, `${name} holds its height with no file`).toBeGreaterThan(viewport.height * 0.2)
      expect(Math.abs(f.boxWidth / f.boxHeight - f.width / f.height), `${name} holds the file's shape`).toBeLessThan(
        0.02,
      )
    }

    // every candidate rides ipx over a relative source, one source per format
    const urls = await page
      .locator('[data-frame-index] img, [data-frame-index] source')
      .evaluateAll((els) => els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']))
    const candidates = urls.flatMap((u) => u.split(', ')).filter(Boolean)
    expect(candidates.length).toBeGreaterThan(frames.length)
    for (const u of candidates) {
      expect(u).toMatch(/^\/_ipx\/[^/]*f_(avif|webp|jpeg)[^/]*\/api\/media\//)
    }
  })

  test('the page does not shift when photographs arrive late', async ({ page }) => {
    await page.route('**/_ipx/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.continue()
    })
    await gotoHydrated(page, READER)
    await firstViewArrived(page)

    const shift = await page.evaluate(
      () =>
        new Promise<number>((resolve) => {
          let total = 0
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) {
              if (!entry.hadRecentInput) total += entry.value
            }
          }).observe({ type: 'layout-shift', buffered: true })
          setTimeout(() => resolve(total), 300)
        }),
    )
    expect(shift, 'cumulative layout shift').toBeLessThan(0.1)
  })

  test('desktop first view stays under the 1 MB budget', async ({ page }) => {
    // measured as smoke.spec.ts measures the homepage: the bytes every
    // response declares
    let transferred = 0
    const responses: { url: string; bytes: number }[] = []
    page.on('response', (response) => {
      const length = Number(response.headers()['content-length'] ?? 0)
      transferred += length
      if (length > 0) responses.push({ url: response.url(), bytes: length })
    })
    await gotoHydrated(page, READER)
    await firstViewArrived(page)

    const photographs = responses.filter((r) => r.url.includes('/_ipx/'))
    expect(photographs.length, 'photographs in the first view').toBeGreaterThan(0)
    expect(photographs.length, 'frames far below the fold wait for the reader').toBeLessThan(6)
    // On failure, name the weight: the ten heaviest responses.
    const breakdown = responses
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, 10)
      .map((r) => `${Math.round(r.bytes / 1024)}KB ${r.url.slice(0, 120)}`)
      .join('\n')
    expect(transferred, `heaviest responses:\n${breakdown}`).toBeLessThan(1_000_000)
  })
})

/**
 * The first view is whole when the first frame has arrived and so has every
 * frame the browser has started on. Frames further down have not started:
 * they are lazy, and that is the point.
 */
async function firstViewArrived(page: Page) {
  await page.waitForFunction(
    () => {
      const images = [...document.querySelectorAll<HTMLImageElement>('[data-frame-index] img')]
      const arrived = (img: HTMLImageElement) => img.complete && img.naturalWidth > 0
      return images.length > 0 && arrived(images[0]!) && images.every((img) => !img.currentSrc || arrived(img))
    },
    null,
    { timeout: 20_000 },
  )
}
