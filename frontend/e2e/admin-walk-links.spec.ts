import { expect, test, type APIRequestContext } from '@playwright/test'

/**
 * Walk links in the Payload admin and API (backend, port 3001): work links
 * only to walks that have already happened, the reverse side is a join that
 * honours drafts and access, and albums carry a credit like frames do.
 * Needs the seeded admin (SEED_ADMIN_*) and the SEED_DEMO walks.
 */

const ADMIN = process.env.PAYLOAD_URL ?? 'http://localhost:3001'
const EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@bathong.local'
const PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'bathong-admin-dev'

let token: string
let pastWalk: { id: number; title: string }
let nextWalk: { id: number; title: string }
const created: { collection: string; id: number }[] = []

async function login(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${ADMIN}/api/users/login`, {
    data: { email: EMAIL, password: PASSWORD },
  })
  expect(res.ok(), `admin login failed: ${res.status()}`).toBeTruthy()
  return (await res.json()).token as string
}

const auth = () => ({ Authorization: `JWT ${token}` })

async function walkBySlug(request: APIRequestContext, slug: string) {
  const res = await request.get(`${ADMIN}/api/walks?where[slug][equals]=${slug}&depth=0&limit=1&joins=false`)
  const { docs } = await res.json()
  expect(docs[0], `seeded walk ${slug}`).toBeTruthy()
  return docs[0] as { id: number; title: string }
}

test.beforeAll(async ({ request }) => {
  // One login per run (global-setup.ts); a second concurrent login would
  // invalidate the other admin spec's session.
  token = process.env.E2E_ADMIN_TOKEN ?? (await login(request))
  pastWalk = await walkBySlug(request, 'demo-past-walk')
  nextWalk = await walkBySlug(request, 'demo-next-walk')
})

test.afterAll(async ({ request }) => {
  for (const { collection, id } of created.reverse()) {
    await request.delete(`${ADMIN}/api/${collection}/${id}`, { headers: auth() })
  }
})

test('an essay cannot be linked to a walk that has not happened', async ({ request }) => {
  const res = await request.post(`${ADMIN}/api/essays`, {
    headers: auth(),
    data: { title: 'E2E: future link', walks: [nextWalk.id] },
  })
  expect(res.status()).toBe(400)
  expect(JSON.stringify(await res.json())).toContain('already happened')
})

test('a frame cannot be linked to a walk that has not happened', async ({ request }) => {
  const media = await (await request.get(`${ADMIN}/api/media?limit=1&depth=0`)).json()
  const res = await request.post(`${ADMIN}/api/frames`, {
    headers: auth(),
    data: { image: media.docs[0].id, creditOverride: 'E2E', walk: nextWalk.id },
  })
  expect(res.status()).toBe(400)
  expect(JSON.stringify(await res.json())).toContain('already happened')
})

test('a walked walk links, and the walk lists the essay through its join (drafts only for editors)', async ({
  request,
}) => {
  const res = await request.post(`${ADMIN}/api/essays`, {
    headers: auth(),
    data: { title: 'E2E: draft from the past walk', walks: [pastWalk.id], _status: 'draft' },
  })
  expect(res.status()).toBe(201)
  const essay = (await res.json()).doc as { id: number }
  created.push({ collection: 'essays', id: essay.id })

  // anonymous readers never see the draft in the walk's join
  const anon = await (await request.get(`${ADMIN}/api/walks/${pastWalk.id}?depth=0`)).json()
  const anonIds = (anon.essays?.docs ?? []).map((d: number | { id: number }) => (typeof d === 'object' ? d.id : d))
  expect(anonIds).not.toContain(essay.id)
  expect(anonIds.length, 'the published demo essay is still there').toBeGreaterThan(0)

  // the editor sees it with drafts on
  const admin = await (
    await request.get(`${ADMIN}/api/walks/${pastWalk.id}?depth=0&draft=true`, { headers: auth() })
  ).json()
  const adminIds = (admin.essays?.docs ?? []).map((d: number | { id: number }) => (typeof d === 'object' ? d.id : d))
  expect(adminIds).toContain(essay.id)
})

test('an album must carry a credit and can only come from a walked walk', async ({ request }) => {
  const media = await (await request.get(`${ADMIN}/api/media?limit=1&depth=0`)).json()
  const uncredited = await request.post(`${ADMIN}/api/albums`, {
    headers: auth(),
    data: { title: 'E2E: no credit', images: [media.docs[0].id] },
  })
  expect(uncredited.status()).toBe(400)
  expect(JSON.stringify(await uncredited.json())).toContain('credit')

  const future = await request.post(`${ADMIN}/api/albums`, {
    headers: auth(),
    data: { title: 'E2E: future album', images: [media.docs[0].id], creditOverride: 'E2E', walks: [nextWalk.id] },
  })
  expect(future.status()).toBe(400)
  expect(JSON.stringify(await future.json())).toContain('already happened')

  const ok = await request.post(`${ADMIN}/api/albums`, {
    headers: auth(),
    data: { title: 'E2E: from the past walk', images: [media.docs[0].id], creditOverride: 'E2E', walks: [pastWalk.id] },
  })
  expect(ok.status()).toBe(201)
  created.push({ collection: 'albums', id: (await ok.json()).doc.id })
})

test('a draft walk never reaches the public archive, even with frames linked to it', async ({
  request,
}) => {
  const walk = await request.post(`${ADMIN}/api/walks`, {
    headers: auth(),
    data: {
      title: 'E2E: draft walk that happened',
      slug: 'e2e-draft-walk',
      date: '2026-01-10T06:00:00+02:00',
      _status: 'draft',
    },
  })
  expect(walk.status()).toBe(201)
  const walkId = (await walk.json()).doc.id as number
  created.push({ collection: 'walks', id: walkId })

  const media = await (await request.get(`${ADMIN}/api/media?limit=1&depth=0`)).json()
  const frame = await request.post(`${ADMIN}/api/frames`, {
    headers: auth(),
    data: { image: media.docs[0].id, creditOverride: 'E2E', walk: walkId, tags: ['e2e-draft-walk'] },
  })
  expect(frame.status()).toBe(201)
  const frameId = (await frame.json()).doc.id as number
  created.push({ collection: 'frames', id: frameId })

  // anonymous: the archive lists the frame (public media) but names no walk
  const archive = await (await request.get(`${ADMIN}/api/archive?tag=e2e-draft-walk`)).json()
  expect(archive.docs.map((d: { id: number }) => d.id)).toContain(frameId)
  expect(archive.docs.find((d: { id: number }) => d.id === frameId).walkSlug).toBeNull()
  expect(archive.facets.walks.map((w: { slug: string }) => w.slug)).not.toContain('e2e-draft-walk')
  const filtered = await (await request.get(`${ADMIN}/api/archive?walk=e2e-draft-walk`)).json()
  expect(filtered.totalDocs).toBe(0)
})

test('the admin picker only offers walks that have happened', async ({ page, request }) => {
  const res = await request.post(`${ADMIN}/api/essays`, {
    headers: auth(),
    data: { title: 'E2E: picker fixture', _status: 'draft' },
  })
  expect(res.status()).toBe(201)
  const essay = (await res.json()).doc as { id: number }
  created.push({ collection: 'essays', id: essay.id })

  await page.context().addCookies([{ name: 'payload-token', value: token, url: ADMIN }])
  await page.goto(`${ADMIN}/admin/collections/essays/${essay.id}`)
  const field = page.locator('#field-walks')
  await expect(field).toBeVisible({ timeout: 20_000 })
  await field.locator('.rs__control, .react-select__control, [class*="control"]').first().click()
  const menu = page.locator('[class*="menu"]').last()
  await expect(menu).toContainText(pastWalk.title, { timeout: 10_000 })
  await expect(menu).not.toContainText(nextWalk.title)
})
