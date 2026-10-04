import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Photograph helpers for the e2e suite. The Nuxt server encodes every
 * rendition through ipx from the CMS, and under a full run an encode can be
 * slow or fail (the request answers 500) for reasons no change under test
 * caused. So nothing here waits for a photograph to decode. A file is waited
 * on until it settles, arrived or failed, and only for a bounded time; what
 * is asserted without it is what the markup guarantees.
 */

/**
 * Wait for one image to settle. True when its file arrived; false when it
 * failed, or is still on its way after `timeout`. A slow file does not throw.
 */
export async function fileArrived(img: Locator, timeout = 15_000): Promise<boolean> {
  await expect
    .poll(() => img.evaluate((el: HTMLImageElement) => el.complete), { timeout })
    .toBe(true)
    .catch(() => {})
  return img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)
}

/**
 * Never cropped: the box an image is given has the file's own shape. The
 * shape is read from the width and height attributes the markup carries from
 * the CMS, so this half holds with no file at all. The other half, that the
 * rendition itself has that shape, does need a loaded image: it is checked
 * when the file arrived and left out when the encode failed, never waited on
 * without end.
 */
export async function expectUncropped(img: Locator) {
  await img.scrollIntoViewIfNeeded()
  const arrived = await fileArrived(img)
  const shape = await img.evaluate((el: HTMLImageElement) => ({
    file: Number(el.getAttribute('width')) / Number(el.getAttribute('height')),
    rendered: el.clientWidth / el.clientHeight,
    natural: el.naturalWidth / el.naturalHeight,
  }))
  expect(Number.isFinite(shape.file), 'the image carries the file dimensions').toBe(true)
  expect(Math.abs(shape.file - shape.rendered), "the box has the file's shape").toBeLessThan(0.02)
  if (arrived) {
    expect(Math.abs(shape.natural - shape.rendered), 'the rendition has the shape of its box').toBeLessThan(0.02)
  }
}

/**
 * The first view has landed: the fonts are in, every image the browser has
 * started on has settled, and nothing new has finished loading for half a
 * second (the route chunks Nuxt prefetches once the page is idle are part
 * of what a visitor is sent, so a budget has to wait for them). Lazy images
 * further down have not started, and that is the point. Settled, not
 * decoded: a failed encode counts, so a transfer budget measured after this
 * does not hang on one. This stands in for `networkidle`, which is not
 * reached while a cold encode is still on its way.
 */
export async function firstViewSettled(page: Page, timeout = 20_000) {
  let before = -1
  await expect
    .poll(
      async () => {
        const now = await page.evaluate(() => ({
          settled:
            document.fonts.status === 'loaded' &&
            [...document.querySelectorAll('img')].every((img) => !img.currentSrc || img.complete),
          resources: performance.getEntriesByType('resource').length,
        }))
        const quiet = now.settled && now.resources === before
        before = now.resources
        return quiet
      },
      { message: 'the first view settles', intervals: [500], timeout },
    )
    .toBe(true)
}
