import { expect, test, type APIRequestContext } from '@playwright/test'
import sharp from 'sharp'

/**
 * Share cards (C2-C6 and the index cards): every entity and index page's
 * og:image is its generated card, each card is a real 1200x630 JPEG under
 * the 300 KB WhatsApp ceiling, and failure paths serve the C1 default rather
 * than breaking. A generated card must never BE the default: a renderer
 * that fails falls back silently, and only this comparison notices. Spec:
 * design-system/design_handoff_frontend_v2/design-references/share-cards.html
 */

const SIZE_CEILING = 300 * 1024

// The first render of a card loads fonts, fetches the photo from the CMS and
// runs satori + resvg; under a full parallel run that can pass 30s.
test.describe.configure({ timeout: 60_000 })

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

/** A card the renderer made itself, not the fallback wearing its URL. */
async function expectGeneratedCard(request: APIRequestContext, path: string) {
  const body = await expectCard(request, path)
  const defaultCard = await (await request.get('/share/default.jpg')).body()
  expect(body.equals(defaultCard), `${path} fell back to the default card`).toBe(false)
  return body
}

async function ogImage(page: import('@playwright/test').Page, path: string) {
  await page.goto(path)
  return page.locator('meta[property="og:image"]').getAttribute('content')
}

test('essay page shares its generated C2 card', async ({ page, request }) => {
  const content = await ogImage(page, '/stories/demo-reader-essay')
  expect(content).toMatch(/\/share\/essay\/demo-reader-essay\.jpg\?v=\d+&c=\d+$/)
  await expectGeneratedCard(request, '/share/essay/demo-reader-essay.jpg')
})

test('photographer page shares its generated C3 card', async ({ page, request }) => {
  // Mads has seeded frames, so with no portrait the newest frame leads. A
  // photographer with neither (the seeded Jacques) is served the default.
  const content = await ogImage(page, '/photographers/mads-norgaard')
  expect(content).toMatch(/\/share\/photographer\/mads-norgaard\.jpg\?v=\d+&c=\d+$/)
  await expectGeneratedCard(request, '/share/photographer/mads-norgaard.jpg')
})

test('walks page shares the C4 card while a walk is upcoming', async ({ page, request }) => {
  const content = await ogImage(page, '/walks')
  expect(content).toMatch(/\/share\/(walks\.jpg\?v=\d+&c=\d+|default\.jpg)$/)
  if (content?.includes('walks.jpg')) await expectGeneratedCard(request, '/share/walks.jpg')
})

test('a walk page shares its own C4 card', async ({ page, request }) => {
  const content = await ogImage(page, '/walks/demo-past-walk')
  expect(content).toMatch(/\/share\/walk\/demo-past-walk\.jpg\?v=\d+&c=\d+$/)
  await expectGeneratedCard(request, '/share/walk/demo-past-walk.jpg')
})

test('an album page shares its generated C6 card', async ({ page, request }) => {
  const content = await ogImage(page, '/albums/demo-behind-the-walk')
  expect(content).toMatch(/\/share\/album\/demo-behind-the-walk\.jpg\?v=\d+&c=\d+$/)
  await expectGeneratedCard(request, '/share/album/demo-behind-the-walk.jpg')
})

test('a workshop page shares its own card', async ({ page, request }) => {
  const content = await ogImage(page, '/workshops/demo-past-workshop')
  expect(content).toMatch(/\/share\/workshop\/demo-past-workshop\.jpg\?v=\d+&c=\d+$/)
  await expectGeneratedCard(request, '/share/workshop/demo-past-workshop.jpg')
})

test('the workshops page shares the next-workshop card while one is upcoming', async ({ page, request }) => {
  const content = await ogImage(page, '/workshops')
  expect(content).toMatch(/\/share\/(workshops\.jpg\?v=\d+&c=\d+|default\.jpg)$/)
  if (content?.includes('workshops.jpg')) await expectGeneratedCard(request, '/share/workshops.jpg')
})

test('a walked walk leads with a photograph from the walk, not the plate', async ({ request }) => {
  // demo-past-walk has an essay, frames and albums. The plate is flat
  // jacaranda (#7B5CD6) above the bar; a photograph is not.
  const walked = await expectGeneratedCard(request, '/share/walk/demo-past-walk.jpg')
  const { data } = await sharp(walked)
    .extract({ left: 560, top: 20, width: 80, height: 8 })
    .resize(1, 1)
    .raw()
    .toBuffer({ resolveWithObject: true })
  const distance = Math.abs(data[0]! - 0x7b) + Math.abs(data[1]! - 0x5c) + Math.abs(data[2]! - 0xd6)
  expect(distance).toBeGreaterThan(40)
})

for (const [path, card] of [
  ['/albums', 'albums'],
  ['/stories', 'stories'],
  ['/photographers', 'photographers'],
  ['/archive', 'archive'],
] as const) {
  test(`the ${path} index shares its own photograph card`, async ({ page, request }) => {
    const content = await ogImage(page, path)
    expect(content).toMatch(new RegExp(`/share/${card}\\.jpg\\?v=\\d+&c=\\d+$`))
    await expectGeneratedCard(request, `/share/${card}.jpg`)
  })
}

test('photocalls page shares the C5 card only while a call is open', async ({ page }) => {
  const content = await ogImage(page, '/photocalls')
  expect(content).toMatch(/\/share\/(photocalls\.jpg\?v=\d+&c=\d+|default\.jpg)$/)
})

test('a generated card answers HEAD like GET, and refuses to be posted to', async ({ request }) => {
  // crawlers and validators probe with HEAD before they fetch the image
  const head = await request.head('/share/album/demo-behind-the-walk.jpg')
  expect(head.status()).toBe(200)
  expect(head.headers()['content-type']).toContain('image/jpeg')
  const post = await request.post('/share/album/demo-behind-the-walk.jpg')
  expect(post.status()).toBe(405)
})

test('unknown entities and failures serve the default card, never an error', async ({
  request,
}) => {
  const defaultCard = await (await request.get('/share/default.jpg')).body()
  for (const path of [
    '/share/essay/does-not-exist.jpg',
    '/share/walk/does-not-exist.jpg',
    '/share/album/does-not-exist.jpg',
    '/share/workshop/does-not-exist.jpg',
  ]) {
    const fallback = await expectCard(request, path)
    expect(fallback.equals(defaultCard), path).toBe(true)
  }
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
