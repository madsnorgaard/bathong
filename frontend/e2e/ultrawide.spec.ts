import { test, expect } from '@playwright/test'

/**
 * Large screens (#171): at 3440px the layouts hold (no horizontal scroll)
 * and no photograph is rendered wider than the file it received, unless
 * the source itself is smaller than the box. Ratio 1: an ultrawide at 2x
 * asks for twice this and the largest candidates cap it.
 */
test.use({ viewport: { width: 3440, height: 1440 }, deviceScaleFactor: 1 })

const PAGES = ['/', '/stories', '/albums', '/photographers', '/archive', '/stories/demo-reader-essay']

for (const path of PAGES) {
  test(`${path} at 3440px: no horizontal scroll, images at least as wide as their box`, async ({ page }) => {
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

    const soft = await page.evaluate(() =>
      [...document.querySelectorAll('img')]
        .filter((img) => img.currentSrc && img.getBoundingClientRect().width > 200)
        .map((img) => {
          const box = Math.round(img.getBoundingClientRect().width)
          // the candidate the browser chose: w_NNN, or s_NNNxMMM when height is known
          const m = /[?&/](?:w_(\d+)|s_(\d+)x\d+)/.exec(img.currentSrc)
          const chosen = m ? Number(m[1] ?? m[2]) : null
          return { src: img.currentSrc.replace(location.origin, '').slice(0, 100), box, chosen, natural: img.naturalWidth }
        })
        // a file smaller than its candidate is source-bound: the original is that small
        .filter((i) => i.chosen !== null && i.natural >= i.chosen * 0.98)
        // the candidate must cover the box; 2% is sub-pixel rounding
        .filter((i) => (i.chosen as number) < i.box * 0.98),
    )
    expect(soft, `images given a file narrower than their box:\n${JSON.stringify(soft, null, 1)}`).toEqual([])
  })
}
