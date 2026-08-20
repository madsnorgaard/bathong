import { expect, test, type APIRequestContext } from '@playwright/test'
import sharp from 'sharp'

/**
 * Share cards (C2-C5): every entity page's og:image is its generated card,
 * each card is a real 1200x630 JPEG under the 300 KB WhatsApp ceiling, and
 * failure paths serve the C1 default rather than breaking. Spec:
 * design-system/design_handoff_frontend_v2/design-references/share-cards.html
 */

const SIZE_CEILING = 300 * 1024

async function expectCard(request: APIRequestContext, path: string) {
  const res = await request.get(path)
  expect(res.status()).toBe(200)
  expect(res.headers()['content-type']).toContain('image/jpeg')
  const body = await res.body()
  expect(body.length).toBeLessThanOrEqual(SIZE_CEILING)
  const meta = await sharp(body).metadata()
  expect(meta.width).toBe(1200)
  expect(meta.height).toBe(630)
  return body
}

async function ogImage(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  return page.locator('meta[property="og:image"]').getAttribute('content')
}

test('essay page shares its generated C2 card', async ({ page, request }) => {
  const content = await ogImage(page, '/stories/demo-reader-essay')
  expect(content).toMatch(/\/share\/essay\/demo-reader-essay\.jpg\?v=\d+$/)
  await expectCard(request, '/share/essay/demo-reader-essay.jpg')
})

test('photographer page shares its generated C3 card', async ({ page, request }) => {
  const content = await ogImage(page, '/photographers/jacques-nelles')
  expect(content).toMatch(/\/share\/photographer\/jacques-nelles\.jpg\?v=\d+$/)
  await expectCard(request, '/share/photographer/jacques-nelles.jpg')
})

test('walks page shares the C4 card while a walk is upcoming', async ({ page, request }) => {
  const content = await ogImage(page, '/walks')
  expect(content).toMatch(/\/share\/(walks\.jpg\?v=\d+|default\.jpg)$/)
  if (content?.includes('walks.jpg')) await expectCard(request, '/share/walks.jpg')
})

test('photocalls page shares the C5 card only while a call is open', async ({ page }) => {
  const content = await ogImage(page, '/photocalls')
  expect(content).toMatch(/\/share\/(photocalls\.jpg\?v=\d+|default\.jpg)$/)
})

test('unknown entities and failures serve the default card, never an error', async ({
  request,
}) => {
  const fallback = await expectCard(request, '/share/essay/does-not-exist.jpg')
  const defaultCard = await (await request.get('/share/default.jpg')).body()
  expect(fallback.equals(defaultCard)).toBe(true)
})

test('home and about keep the C1 default card', async ({ page }) => {
  for (const path of ['/', '/about']) {
    const content = await ogImage(page, path)
    expect(content).toMatch(/\/share\/default\.jpg$/)
  }
})

test('copyright meta travels on every page', async ({ page }) => {
  await page.goto('/photographers/jacques-nelles')
  await expect(page.locator('meta[name="copyright"]')).toHaveAttribute(
    'content',
    /© .*Bathong\. Collective/,
  )
})
