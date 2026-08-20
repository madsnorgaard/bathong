import { test, expect, type Page } from '@playwright/test'

/**
 * Phase 1 smoke suite against the seeded local stack (SEED_DEMO=true):
 * SSR rendering, share meta invariants, credits, the RSVP flow, and the
 * homepage transfer budget. See playwright.config.ts for boot expectations.
 */

async function expectShareMeta(page: Page) {
  const ogImages = page.locator('meta[property="og:image"]')
  await expect(ogImages).toHaveCount(1)
  const content = await ogImages.getAttribute('content')
  expect(content).toMatch(/^https:\/\//)
  expect(content).toMatch(/\.jpg/)
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    'content',
    'summary_large_image',
  )
}

test.describe('home', () => {
  test('renders SSR with one absolute og:image and the walk chapter', async ({ page }) => {
    await page.goto('/')
    await expectShareMeta(page)
    await expect(page.locator('.event')).toBeVisible()
    await expect(page.getByText('R -').first()).toBeVisible()
  })

  test('every feed frame carries a credit', async ({ page }) => {
    await page.goto('/')
    const frames = page.locator('.feed .b-frame')
    const count = await frames.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(frames.nth(i).locator('.b-credit')).toHaveText(/.+/)
    }
  })

  test('every rendered image is served through ipx', async ({ page }) => {
    // Regression guard: when the ipx domain allowlist/alias breaks,
    // @nuxt/image silently falls back to full-res originals. Relative
    // /api/media srcs make that structurally impossible - but only if
    // every surface actually rides /_ipx/.
    await page.goto('/')
    const urls = await page.$$eval('img[src], picture source[srcset]', (els) =>
      els.flatMap((el) => [el.getAttribute('src') ?? '', el.getAttribute('srcset') ?? '']),
    )
    const imageUrls = urls.filter((u) => u.includes('/api/media/') || u.includes('/_ipx/'))
    expect(imageUrls.length).toBeGreaterThan(0)
    for (const u of imageUrls) expect(u).toMatch(/\/_ipx\//)
  })

  test('first view stays under the 1 MB budget', async ({ page }) => {
    let transferred = 0
    page.on('response', async (response) => {
      const headers = response.headers()
      const length = Number(headers['content-length'] ?? 0)
      transferred += length
    })
    await page.goto('/', { waitUntil: 'networkidle' })
    expect(transferred).toBeLessThan(1_000_000)
  })
})

test.describe('walks', () => {
  test('shows the next walk and accepts an RSVP', async ({ page }) => {
    await page.goto('/walks', { waitUntil: 'networkidle' })
    await expectShareMeta(page)
    await expect(page.getByText('№ 001')).toBeVisible()

    await page.getByLabel(/^Name/).fill('Playwright Visitor')
    await page.getByLabel(/^Email/).fill(`pw-${Date.now()}@example.org`)
    await page.getByRole('button', { name: /Reserve a place/ }).click()
    await expect(page.getByText(/on the list|waitlist/)).toBeVisible()
  })

  test('rejects a duplicate RSVP with a readable error', async ({ page }) => {
    const email = `pw-dup-${Date.now()}@example.org`
    for (const _ of [1, 2]) {
      await page.goto('/walks', { waitUntil: 'networkidle' })
      await page.getByLabel(/^Name/).fill('Playwright Dup')
      await page.getByLabel(/^Email/).fill(email)
      await page.getByRole('button', { name: /Reserve a place/ }).click()
      await page.waitForTimeout(500)
    }
    await expect(page.getByText(/already has a place/)).toBeVisible()
  })
})

test.describe('about', () => {
  test('renders the word, the directors and honest pricing', async ({ page }) => {
    await page.goto('/about')
    await expectShareMeta(page)
    await expect(page.getByText('ba·thong')).toBeVisible()
    await expect(page.getByText('Emmanuel Munano')).toBeVisible()
    await expect(page.getByText('Mads Nørgaard')).toBeVisible()
    await expect(page.getByText('R -').first()).toBeVisible()
    await expect(page.getByText(/keep their copyright/i).first()).toBeVisible()
  })
})
