import { test, expect } from '@playwright/test'

/**
 * Large screens (#171): at 3440px the layouts hold (no horizontal scroll)
 * and every photograph is offered a candidate as wide as its box, unless
 * the source itself is narrower. Ratio 1: an ultrawide at 2x asks for twice
 * this and the largest candidates cap it.
 */
test.use({ viewport: { width: 3440, height: 1440 }, deviceScaleFactor: 1 })

const PAGES = ['/', '/stories', '/albums', '/photographers', '/archive', '/stories/demo-reader-essay']

for (const path of PAGES) {
  test(`${path} at 3440px: no horizontal scroll, a candidate as wide as every box`, async ({ page }) => {
    await page.goto(path)
    // bring every lazy image into view, then let the files arrive
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 1000) {
        window.scrollTo(0, y)
        await new Promise((r) => setTimeout(r, 100))
      }
      window.scrollTo(0, 0)
    })
    await page.waitForLoadState('networkidle')

    const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(wide, 'pixels of horizontal overflow').toBeLessThanOrEqual(0)

    // What the markup offers, not what decoded: the widest candidate in the
    // srcset against the box, capped by the file's own width where the
    // markup carries it (the reader's ladder ends at the source width).
    const soft = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((img) => img.getBoundingClientRect().width > 200)
        .map((img) => {
          const box = Math.round(img.getBoundingClientRect().width)
          const source = img.closest('picture')?.querySelector('source')
          const srcset = source?.getAttribute('srcset') ?? img.getAttribute('srcset') ?? ''
          const offered = Math.max(0, ...[...srcset.matchAll(/ (\d+)w(?:,|$)/g)].map((m) => Number(m[1])))
          const file = Number(img.getAttribute('width')) || Infinity
          return { src: (img.currentSrc || img.src).replace(location.origin, '').slice(0, 100), box, offered, file }
        })
        .filter((i) => i.offered > 0 && i.offered < Math.min(i.box, i.file) * 0.98),
    )
    expect(soft, `images offered no candidate as wide as their box:\n${JSON.stringify(soft, null, 1)}`).toEqual([])
  })
}
