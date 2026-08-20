import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'

/**
 * The visual sequence editor in the Payload admin (backend, port 3001).
 * First admin-facing spec: needs a seeded admin user - locally and in CI the
 * seed runs with SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (defaults below match
 * the local dev seed; ci.yml sets its own).
 *
 * Uses a dedicated fixture essay created in beforeAll so the demo essay the
 * reader spec depends on is never touched.
 */

const ADMIN = process.env.PAYLOAD_URL ?? 'http://localhost:3001'
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@bathong.local'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'bathong-admin-dev'
const SHOTS = 'test-results/seq-progress'

const lex = (text: string) => ({
  root: {
    type: 'root',
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
    children: [
      {
        type: 'paragraph',
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
        children: [{ type: 'text', text, detail: 0, format: 0, mode: 'normal', style: '', version: 1 }],
      },
    ],
  },
})

let token: string
let essayId: number
let frameIds: number[]

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${ADMIN}/api/users/login`, {
    data: { email: EMAIL, password: PASSWORD },
  })
  expect(res.ok(), `admin login failed: ${res.status()}`).toBeTruthy()
  const body = await res.json()
  return body.token as string
}

async function authed(page: Page) {
  await page.context().addCookies([
    { name: 'payload-token', value: token, url: ADMIN },
  ])
}

async function getEssay(request: APIRequestContext) {
  const res = await request.get(`${ADMIN}/api/essays/${essayId}?depth=0&draft=true`, {
    headers: { Authorization: `JWT ${token}` },
  })
  expect(res.ok()).toBeTruthy()
  return res.json()
}

async function openEditor(page: Page) {
  await authed(page)
  await page.goto(`${ADMIN}/admin/collections/essays/${essayId}`)
  await expect(page.locator('.seq-editor__strip')).toBeVisible({ timeout: 20_000 })
  // Thumbnails come from the frames-index fetch; wait for the first image.
  await expect(page.locator('.seq-tile img.seq-thumb').first()).toBeVisible({ timeout: 15_000 })
}

async function saveDraft(page: Page) {
  // Synchronise on the save request itself - toasts linger for seconds, so a
  // stale "saved" toast from a previous save would confirm too early.
  const [resp] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/essays') &&
        ['PATCH', 'POST'].includes(r.request().method()) &&
        r.request().url().includes('draft=true'),
      { timeout: 15_000 },
    ),
    page.getByRole('button', { name: /save draft/i }).click(),
  ])
  expect(resp.ok(), `draft save responded ${resp.status()}`).toBeTruthy()
  // Let the form-state merge settle before further row edits.
  await page.waitForTimeout(400)
}

/**
 * Toggle a tile's full-bleed to a target state. The bleed button lives in a
 * hover-revealed toolbar and the click can land before the toggle handler is
 * wired (admin hydration) - the source of repeated CI flakes (#54). Assert
 * the per-tile class after every click and retry until the target state
 * holds; checking the TARGET state each attempt makes the loop convergent
 * even if a slow render made us double-click.
 */
async function setBleed(tile: Locator, on: boolean) {
  for (let attempt = 0; attempt < 3; attempt++) {
    await tile.hover()
    await tile.getByRole('button', { name: 'bleed', exact: true }).click()
    try {
      if (on) await expect(tile).toHaveClass(/seq-tile--bleed/, { timeout: 4000 })
      else await expect(tile).not.toHaveClass(/seq-tile--bleed/, { timeout: 4000 })
      return
    } catch {
      // toggle didn't land (or landed opposite) - loop retries toward target
    }
  }
  throw new Error(`bleed toggle never reached ${on ? 'on' : 'off'} after 3 attempts`)
}

// 90s: in CI the backend is `next dev`, and the essay edit view compiles
// on the first hit - that alone can consume most of the default 30s.
test.describe.configure({ mode: 'serial', timeout: 90_000 })

test.beforeAll(async ({ request }) => {
  token = await login(request)
  const framesRes = await request.get(`${ADMIN}/api/frames?limit=8&depth=0&sort=id`, {
    headers: { Authorization: `JWT ${token}` },
  })
  expect(framesRes.ok()).toBeTruthy()
  frameIds = (await framesRes.json()).docs.map((d: { id: number }) => d.id)
  expect(frameIds.length, 'seed must provide at least 6 frames').toBeGreaterThanOrEqual(6)

  const created = await request.post(`${ADMIN}/api/essays?draft=true&depth=0`, {
    headers: { Authorization: `JWT ${token}` },
    data: {
      title: 'Sequence editor fixture',
      slug: 'seq-editor-fixture',
      sequence: [
        { blockType: 'frame', frame: frameIds[0], fullBleed: true },
        { blockType: 'text', body: lex('A text interlude between frames.') },
        { blockType: 'frame', frame: frameIds[1], fullBleed: false },
        { blockType: 'pair', left: frameIds[2], right: frameIds[3] },
        { blockType: 'frame', frame: frameIds[4], fullBleed: false },
        { blockType: 'frame', frame: frameIds[5], fullBleed: false },
      ],
    },
  })
  expect(created.ok(), `essay create failed: ${created.status()}`).toBeTruthy()
  essayId = (await created.json()).doc.id
})

test.afterAll(async ({ request }) => {
  if (essayId) {
    await request.delete(`${ADMIN}/api/essays/${essayId}`, {
      headers: { Authorization: `JWT ${token}` },
    })
  }
})

test('strip renders every block type with honest sizing and count', async ({ page }) => {
  await openEditor(page)

  const tiles = page.locator('.seq-tile')
  await expect(tiles).toHaveCount(6)
  await expect(page.locator('.seq-tile--text')).toHaveCount(1)
  await expect(page.locator('.seq-tile--pair')).toHaveCount(1)
  await expect(page.locator('.seq-editor__count')).toContainText('6 frames')

  // Full-bleed tile renders wider than a default frame tile.
  const bleedBox = await page.locator('.seq-tile--bleed').first().boundingBox()
  const plainBox = await page
    .locator('.seq-tile--frame:not(.seq-tile--bleed)')
    .first()
    .boundingBox()
  expect(bleedBox!.width).toBeGreaterThan(plainBox!.width * 1.3)

  // Pair tile shows two thumbnails and a combined position "02+03".
  await expect(page.locator('.seq-tile--pair .seq-thumb')).toHaveCount(2)
  await expect(page.locator('.seq-tile--pair .seq-tile__pos')).toHaveText('03+04')

  await page.screenshot({ path: `${SHOTS}/1-strip.png`, fullPage: true })
})

test('keyboard reorder persists and stays byte-identical in shape', async ({ page, request }) => {
  await openEditor(page)

  const before = (await getEssay(request)).sequence
  // Move the second frame block (index 2 in the strip) one position later.
  const tile = page.locator('.seq-tile').nth(2)
  await tile.hover()
  await tile.getByRole('button', { name: /move position 3 later/i }).click()
  await saveDraft(page)

  const after = (await getEssay(request)).sequence
  expect(after[2].blockType).toBe('pair')
  expect(after[3].blockType).toBe('frame')
  expect(after[3].frame).toBe(before[2].frame)

  // Byte-shape: same keys per block type as a stock-UI-authored sequence.
  for (const block of after) {
    const keys = Object.keys(block).sort()
    if (block.blockType === 'frame') {
      expect(keys).toEqual(['blockName', 'blockType', 'captionOverride', 'frame', 'fullBleed', 'id'])
      expect(typeof block.frame).toBe('number')
    }
    if (block.blockType === 'pair') {
      expect(keys).toEqual(['blockName', 'blockType', 'captionOverride', 'id', 'left', 'right'])
    }
    if (block.blockType === 'text') {
      expect(keys).toEqual(['blockName', 'blockType', 'body', 'id'])
    }
  }

  await page.screenshot({ path: `${SHOTS}/2-reorder.png`, fullPage: true })
})

test('drag reorder works', async ({ page, request }) => {
  await openEditor(page)
  const before = (await getEssay(request)).sequence

  // Raw mouse events do not auto-scroll the way locator clicks do.
  await page.locator('.seq-editor__strip').scrollIntoViewIfNeeded()
  const source = page.locator('.seq-tile').nth(5).locator('.seq-tile__media')
  const target = page.locator('.seq-tile').nth(4).locator('.seq-tile__media')
  const from = (await source.boundingBox())!
  const to = (await target.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 })
  await page.mouse.up()
  await saveDraft(page)

  const after = (await getEssay(request)).sequence
  expect(after[4].frame).toBe(before[5].frame)
  expect(after[5].frame).toBe(before[4].frame)
})

test('full bleed toggles inline and the 2-bleed rule still guards publish', async ({
  page,
  request,
}) => {
  await openEditor(page)

  // A second bleed is allowed and persists.
  const tile4 = page.locator('.seq-tile').nth(4)
  await setBleed(tile4, true)
  await expect(page.locator('.seq-tile--bleed')).toHaveCount(2)
  await page.screenshot({ path: `${SHOTS}/3-bleed.png`, fullPage: true })
  await saveDraft(page)
  expect(
    (await getEssay(request)).sequence.filter((b: { fullBleed?: boolean }) => b.fullBleed),
  ).toHaveLength(2)

  // A third bleed trips the collection hook on save - the editor surfaces
  // the error toast instead of crashing or silently dropping the toggle.
  const tile5 = page.locator('.seq-tile').nth(5)
  await setBleed(tile5, true)
  await expect(page.locator('.seq-tile--bleed')).toHaveCount(3)
  // The authoritative contract is the hook rejecting the save with a 400 -
  // synchronise on the response like saveDraft does (the toast alone proved
  // timing-flaky on CI runners, #54). The toast then gets a realistic window.
  const [rejected] = await Promise.all([
    page.waitForResponse(
      (r) =>
        r.url().includes('/api/essays') &&
        ['PATCH', 'POST'].includes(r.request().method()) &&
        r.request().url().includes('draft=true'),
      { timeout: 20_000 },
    ),
    page.getByRole('button', { name: /save draft/i }).click(),
  ])
  expect(rejected.status(), 'the 2-bleed rule must reject the save').toBe(400)
  await expect(page.locator('.payload-toast-container')).toContainText(/full bleed/i, {
    timeout: 30_000,
  })

  // Restore: back to the single original bleed, save clean.
  for (const n of [5, 4]) {
    await setBleed(page.locator('.seq-tile').nth(n), false)
  }
  await saveDraft(page)
})

test('picker multi-select appends in click order', async ({ page, request }) => {
  await openEditor(page)
  const beforeLen = (await getEssay(request)).sequence.length

  await page.getByRole('button', { name: /add frames/i }).click()
  const grid = page.locator('.seq-picker__grid')
  await expect(grid).toBeVisible()
  await expect(page.locator('.seq-picker__tile img').first()).toBeVisible({ timeout: 15_000 })
  // Frames already in the sequence are marked but remain selectable.
  await expect(page.locator('.seq-picker__tile.is-used').first()).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/4-picker.png`, fullPage: true })

  // Click order: 1st tile then 2nd - append order must match. (Low indexes
  // on purpose: CI seeds only 6 frames, and repeats are legitimate.)
  const tileA = page.locator('.seq-picker__tile').nth(0)
  const tileB = page.locator('.seq-picker__tile').nth(1)
  await tileA.click()
  await tileB.click()
  await expect(tileA.locator('.seq-picker__order')).toHaveText('1')
  await page.getByRole('button', { name: /add 2 frames/i }).click()

  await expect(page.locator('.seq-tile')).toHaveCount(beforeLen + 2)
  await saveDraft(page)

  // The picker grid mirrors the frames-index order (-createdAt), so the
  // expected append order comes from the index, not the id-sorted fixture.
  const index = await (
    await request.get(`${ADMIN}/api/frames-index`, { headers: { Authorization: `JWT ${token}` } })
  ).json()
  const after = (await getEssay(request)).sequence
  expect(after).toHaveLength(beforeLen + 2)
  expect(after[after.length - 2].frame).toBe(index.frames[0].id)
  expect(after[after.length - 1].frame).toBe(index.frames[1].id)

  // Remove them again via the tile control. Same hover-toolbar race as the
  // bleed toggle (#54): assert the count actually dropped after each click
  // so a missed click can't leave a stray block behind.
  for (let i = 0; i < 2; i++) {
    const count = await page.locator('.seq-tile').count()
    const last = page.locator('.seq-tile').last()
    await last.hover()
    await last.getByRole('button', { name: /remove position/i }).click()
    await expect(page.locator('.seq-tile')).toHaveCount(count - 1)
  }
  await saveDraft(page)
  expect((await getEssay(request)).sequence).toHaveLength(beforeLen)
})

test('lightbox opens from a strip thumbnail', async ({ page }) => {
  await openEditor(page)
  await page.locator('.seq-tile--frame img.seq-thumb').first().click()
  await expect(page.locator('.seq-lightbox img')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/5-lightbox.png` })
  await page.keyboard.press('Escape')
  await expect(page.locator('.seq-lightbox')).toHaveCount(0)
})

test('lead frame picks visually and persists', async ({ page, request }) => {
  await openEditor(page)

  await page.getByRole('button', { name: /choose frame/i }).click()
  await expect(page.locator('.seq-picker__tile img').first()).toBeVisible({ timeout: 15_000 })
  await page.locator('.seq-picker__tile').first().click()
  await expect(page.locator('.seq-lead__current img')).toBeVisible()
  await page.screenshot({ path: `${SHOTS}/6-leadframe.png`, fullPage: true })
  await saveDraft(page)

  const essay = await getEssay(request)
  expect(typeof essay.leadFrame).toBe('number')
})

test('frames-index endpoint is editor-gated', async ({ request }) => {
  const anon = await request.get(`${ADMIN}/api/frames-index`)
  expect(anon.status()).toBe(403)
  const ok = await request.get(`${ADMIN}/api/frames-index`, {
    headers: { Authorization: `JWT ${token}` },
  })
  expect(ok.ok()).toBeTruthy()
  const body = await ok.json()
  expect(body.frames.length).toBeGreaterThan(0)
  expect(body.frames[0]).toHaveProperty('thumb')
})
