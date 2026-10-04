import { test, expect, type Page, type Request } from '@playwright/test'
import { gotoHydrated } from './helpers/account'

/**
 * Phone budgets (#170). The market is South Africa, phone first, on paid
 * mobile data, so the 1 MB first-view budget that smoke.spec.ts holds the
 * homepage to is held here for the image-heavy pages at a phone's size:
 * 390x844 at device pixel ratio 2, before any scroll. Measured the way
 * smoke.spec.ts measures it (the bytes every response declares), so the
 * numbers mean the same thing.
 *
 * Nothing here waits for networkidle or for a photograph to decode. In CI an
 * encode sometimes fails (ipx times out reaching the CMS) and the image
 * answers 500: that makes the page lighter, not heavier, so the budget still
 * holds, and the breakdown says how many failed.
 *
 * Largest contentful paint is measured on a throttled connection and
 * printed, never asserted: a timing gate would be flaky until the CI stack
 * is stable. The printed numbers are there to choose the limit from.
 * Runs against the SEED_DEMO photographer, album and essay.
 */

test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

const BUDGET = 1_000_000

const PAGES = [
  { name: 'photographer page', path: '/photographers/mads-norgaard' },
  { name: 'album', path: '/albums/demo-behind-the-walk' },
  { name: 'essay reader', path: '/stories/demo-reader-essay' },
  { name: 'stories index', path: '/stories' },
  { name: 'archive', path: '/archive' },
]

/**
 * Slow 4G as Lighthouse and the DevTools preset of that name throttle it:
 * 1.6 Mbit/s down and 750 kbit/s up, each scaled by 0.9, and 150 ms round
 * trip scaled by 3.75 into a per-request latency. Throughput is in bytes
 * per second.
 */
const SLOW_4G = {
  offline: false,
  latency: 562.5,
  downloadThroughput: 184_320,
  uploadThroughput: 84_375,
  connectionType: 'cellular4g',
} as const

interface Weighed {
  url: string
  bytes: number
  status: number
  kind: 'image' | 'script' | 'other'
}

/**
 * Listen before the page opens. Weight is what smoke.spec.ts counts: the
 * content-length of every response. Image requests are tracked from start to
 * finish as well, because the document cannot tell a photograph in flight
 * from a lazy one that has not started: both have no currentSrc yet.
 */
function watchFirstView(page: Page) {
  const responses: Weighed[] = []
  const inFlight = new Set<Request>()
  let imagesStarted = 0
  page.on('request', (request) => {
    if (request.resourceType() !== 'image') return
    imagesStarted += 1
    inFlight.add(request)
  })
  page.on('requestfinished', (request) => inFlight.delete(request))
  page.on('requestfailed', (request) => inFlight.delete(request))
  page.on('response', (response) => {
    const headers = response.headers()
    const type = headers['content-type'] ?? ''
    const image = response.request().resourceType() === 'image'
    responses.push({
      url: response.url(),
      bytes: Number(headers['content-length'] ?? 0),
      status: response.status(),
      kind: image ? 'image' : type.includes('javascript') ? 'script' : 'other',
    })
  })
  return {
    responses,
    inFlight,
    imagesStarted: () => imagesStarted,
  }
}

/**
 * The first view has settled when every image the browser has started on is
 * complete and none is still in flight, and that has held for a second, so a
 * lazy frame that starts just after hydration is counted. Settled, not
 * decoded: an image whose encode failed is complete too. Bounded, and it
 * never throws: an image that hangs must not fail a test about weight. It
 * answers false instead, and the caller says so in the output.
 */
async function firstViewSettled(page: Page, inFlight: Set<Request>, timeout = 15_000): Promise<boolean> {
  const deadline = Date.now() + timeout
  let calm = 0
  while (Date.now() < deadline) {
    const complete = await page.evaluate(() =>
      [...document.images].every((img) => !img.currentSrc || img.complete),
    )
    calm = complete && inFlight.size === 0 ? calm + 1 : 0
    if (calm === 4) return true
    await page.waitForTimeout(250)
  }
  return false
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`

/** Total, images, script and the three heaviest responses: what grew, by name. */
function breakdown(responses: Weighed[]): string {
  const sum = (list: Weighed[]) => list.reduce((n, r) => n + r.bytes, 0)
  const images = responses.filter((r) => r.kind === 'image')
  const failed = images.filter((r) => r.status >= 400).length
  const heaviest = [...responses]
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, 3)
    .map((r) => `  ${kb(r.bytes)} ${r.url.slice(0, 120)}`)
  return [
    `total ${kb(sum(responses))}, images ${kb(sum(images))} in ${images.length} responses (${failed} failed), ` +
      `script ${kb(sum(responses.filter((r) => r.kind === 'script')))}`,
    ...heaviest,
  ].join('\n')
}

test.describe('first view on a phone', () => {
  for (const { name, path } of PAGES) {
    test(`${name}: first view stays under the 1 MB budget`, async ({ page }) => {
      const view = watchFirstView(page)
      await gotoHydrated(page, path)
      const settled = await firstViewSettled(page, view.inFlight)

      const report = breakdown(view.responses)
      console.log(`[budget] ${name} ${path}: ${report}`)
      if (!settled) {
        // not a failure: what has not arrived cannot be weighed, and the
        // output says the number is a floor
        console.log(`[budget] ${name}: ${view.inFlight.size} images still in flight, not counted`)
      }

      // the markup asks for photographs whether or not their encodes succeed
      expect(view.imagesStarted(), 'photographs requested in the first view').toBeGreaterThan(0)
      const transferred = view.responses.reduce((n, r) => n + r.bytes, 0)
      expect(transferred, `${name} first view:\n${report}`).toBeLessThan(BUDGET)
    })
  }
})

test.describe('largest contentful paint on slow 4G', () => {
  for (const { name, path } of PAGES) {
    // Printed, not asserted (see the file header). The only way this fails
    // is the page not arriving at all.
    test(`${name}: largest contentful paint is printed`, async ({ page }) => {
      test.setTimeout(90_000)
      const client = await page.context().newCDPSession(page)
      await client.send('Network.enable')
      await client.send('Network.emulateNetworkConditions', SLOW_4G)

      const view = watchFirstView(page)
      await gotoHydrated(page, path)
      const settled = await firstViewSettled(page, view.inFlight, 45_000)

      const lcp = await page.evaluate(
        () =>
          new Promise<{ ms: number; what: string } | null>((resolve) => {
            let latest: { ms: number; what: string } | null = null
            new PerformanceObserver((list) => {
              for (const entry of list.getEntries() as (PerformanceEntry & { url?: string; element?: Element | null })[]) {
                const tag = entry.element?.tagName.toLowerCase() ?? 'element gone'
                latest = { ms: Math.round(entry.startTime), what: entry.url ? `${tag} ${entry.url}` : tag }
              }
            }).observe({ type: 'largest-contentful-paint', buffered: true })
            setTimeout(() => resolve(latest), 300)
          }),
      )
      console.log(
        `[lcp] ${name} ${path}: ${lcp ? `${lcp.ms} ms (${lcp.what.slice(0, 120)})` : 'no entry'}` +
          `${settled ? '' : ', first view had not settled'}`,
      )
    })
  }
})
