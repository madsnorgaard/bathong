import { test, expect, type APIRequestContext, type APIResponse, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  API,
  adminHeaders,
  deleteUserByEmail,
  freshEmail,
  joinAndActivate,
  retryOnReset,
  signUpAndVerify,
} from './helpers/account'

/**
 * What a member may do with the frames of their own photocall entry (#162):
 * view them, document and file, while nobody else outside the editors can,
 * and never change, publish or remove them. Then the account behind a
 * profile: `owner` stays between the owner and the editors. Everything is
 * asked of the API itself, since that is where the rules live. Runs against
 * the SEED_DEMO open call and needs E2E_HOOKS=true.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

type MediaDoc = {
  id: number
  alt?: string | null
  credit?: string | null
  filename: string
  visibility: 'public' | 'restricted'
  uploadedBy?: number | null
  sizes?: { thumbnail?: { filename?: string | null } }
}

const fileUrl = (filename: string) => `${API}/api/media/file/${encodeURIComponent(filename)}`

// Payload takes the session cookie only from an origin on its csrf list
const origin = (page: Page) => ({ Origin: new URL(page.url()).origin })

/**
 * Entries this spec made for one address, with the frames the entry
 * endpoint made for them. An entry that should have been refused would
 * carry the account and no address, so both are asked for.
 */
async function deleteEntries(request: APIRequestContext, email: string) {
  const users = await request.get(
    `${API}/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0&limit=1`,
    { headers: adminHeaders() },
  )
  const account = ((await users.json()) as { docs?: { id: number }[] }).docs?.[0]
  const wheres = [`where[submitterEmail][equals]=${encodeURIComponent(email)}`]
  if (account) wheres.push(`where[submitter][equals]=${account.id}`)
  for (const where of wheres) {
    const list = await request.get(`${API}/api/submissions?${where}&depth=0&limit=20`, { headers: adminHeaders() })
    const { docs } = (await list.json()) as { docs?: { id: number; submitterEmail?: string | null; images?: number[] }[] }
    for (const entry of docs ?? []) {
      await request.delete(`${API}/api/submissions/${entry.id}`, { headers: adminHeaders() })
      // only the endpoint's frames are the entry's to take along; a file
      // borrowed by id belongs to whoever uploaded it
      if (!entry.submitterEmail) continue
      for (const image of entry.images ?? []) {
        await request.delete(`${API}/api/media/${image}`, { headers: adminHeaders() })
      }
    }
  }
}

test('an entrant views the frames of their own entry; nobody else does, and nobody but editors changes them', async ({
  page,
  request,
  browser,
}) => {
  test.setTimeout(150_000) // two sign-ups, an upload, and a round of refusals
  const email = freshEmail('entry-media')
  const otherEmail = freshEmail('entry-media-other')
  const otherContext = await browser.newContext()
  let theirUpload = 0

  try {
    await signUpAndVerify(page, request, email, 'E2E Entrant')
    const mine = origin(page)

    const calls = await request.get(`${API}/api/photocalls?where[slug][equals]=demo-open-call&depth=0&limit=1`)
    const call = ((await calls.json()) as { docs: { id: number }[] }).docs[0]
    expect(call, 'the seeded demo call').toBeTruthy()

    // the entry goes through the one door, with the member's session
    const entered = await page.request.post(`${API}/api/photocall-entries`, {
      headers: mine,
      multipart: {
        photocall: String(call.id),
        name: 'E2E Entrant',
        email,
        agreedToTerms: 'true',
        frames: {
          name: 'entry-1.jpg',
          mimeType: 'image/jpeg',
          buffer: readFileSync(path.join(FIXTURES, 'entry-1.jpg')),
        },
      },
    })
    expect(entered.status(), await entered.text()).toBe(201)
    const entryId = ((await entered.json()) as { id: number }).id

    // the way the desk asks: the entry comes back with its frame filled in,
    // where it used to be a bare id the member could not open
    const desk = await retryOnReset(() =>
      page.request.get(`${API}/api/submissions/${entryId}?depth=1`, { headers: mine }),
    )
    expect(desk.status()).toBe(200)
    const frames = ((await desk.json()) as { images: (number | MediaDoc)[] }).images
    expect(frames).toHaveLength(1)
    expect(typeof frames[0], 'the frame is populated for its entrant').toBe('object')
    const frameId = (frames[0] as MediaDoc).id

    // the editor's view is the reference the rest is held against
    const reference = await request.get(`${API}/api/media/${frameId}?depth=0`, { headers: adminHeaders() })
    expect(reference.status()).toBe(200)
    const before = (await reference.json()) as MediaDoc
    expect(before.visibility).toBe('restricted')
    // the entrant is not the uploader: nothing they own, only something they may see
    expect(before.uploadedBy ?? null).toBeNull()
    const thumbnail = before.sizes?.thumbnail?.filename
    expect(thumbnail, 'the fixture is large enough for a thumbnail').toBeTruthy()

    await test.step('the entrant reads the document and the files', async () => {
      const doc = await page.request.get(`${API}/api/media/${frameId}?depth=0`, { headers: mine })
      expect(doc.status()).toBe(200)
      expect(((await doc.json()) as MediaDoc).filename).toBe(before.filename)

      const listed = await page.request.get(`${API}/api/media?where[id][equals]=${frameId}&depth=0`, { headers: mine })
      expect(((await listed.json()) as { docs: MediaDoc[] }).docs.map((d) => d.id)).toEqual([frameId])

      const file = await page.request.get(fileUrl(before.filename), { headers: mine })
      expect(file.status()).toBe(200)
      expect(file.headers()['content-type']).toContain('image/jpeg')
      expect((await file.body()).length).toBeGreaterThan(0)

      const size = await page.request.get(fileUrl(thumbnail as string), { headers: mine })
      expect(size.status()).toBe(200)
    })

    const refusedToRead = async (who: string, get: (url: string) => Promise<APIResponse>) => {
      expect((await get(`${API}/api/media/${frameId}?depth=0`)).status(), `${who}: document`).toBe(404)
      const listed = await get(`${API}/api/media?where[id][equals]=${frameId}&depth=0`)
      expect(((await listed.json()) as { docs: MediaDoc[] }).docs, `${who}: list`).toEqual([])
      expect((await get(fileUrl(before.filename))).status(), `${who}: file`).toBe(403)
      expect((await get(fileUrl(thumbnail as string))).status(), `${who}: thumbnail`).toBe(403)
    }

    await test.step('an anonymous request is refused', async () => {
      await refusedToRead('anonymous', (url) => request.get(url))
    })

    await test.step('a second account is refused', async () => {
      const otherPage = await otherContext.newPage()
      await signUpAndVerify(otherPage, request, otherEmail, 'E2E Other Member')
      const theirs = origin(otherPage)
      // signed in for real, or the refusals below would prove nothing
      const me = await otherPage.request.get(`${API}/api/users/me`, { headers: theirs })
      expect(((await me.json()) as { user: { email: string } | null }).user?.email).toBe(otherEmail)

      await refusedToRead('second account', (url) => otherPage.request.get(url, { headers: theirs }))
      const entry = await otherPage.request.get(`${API}/api/submissions/${entryId}?depth=0`, { headers: theirs })
      expect(entry.status(), 'second account: the entry itself').toBe(404)
      for (const data of [{ visibility: 'public' }, { alt: 'Taken over.' }]) {
        const patch = await otherPage.request.patch(`${API}/api/media/${frameId}`, { headers: theirs, data })
        expect(patch.status(), `second account: patch ${JSON.stringify(data)}`).toBe(403)
      }
      const gone = await otherPage.request.delete(`${API}/api/media/${frameId}`, { headers: theirs })
      expect(gone.status(), 'second account: delete').toBe(403)

      // a public upload of their own, for the entrant to try to borrow below
      const upload = await otherPage.request.post(`${API}/api/media`, {
        headers: theirs,
        multipart: {
          file: {
            name: 'entry-2.jpg',
            mimeType: 'image/jpeg',
            buffer: readFileSync(path.join(FIXTURES, 'entry-2.jpg')),
          },
          _payload: JSON.stringify({ alt: 'A public upload by the second account.', visibility: 'public' }),
        },
      })
      expect(upload.status(), await upload.text()).toBe(201)
      theirUpload = ((await upload.json()) as { doc: { id: number } }).doc.id
    })

    await test.step('the entrant cannot change, publish or remove the frame', async () => {
      for (const data of [{ visibility: 'public' }, { alt: 'Rewritten after sending.' }, { credit: 'Somebody Else' }]) {
        const patch = await page.request.patch(`${API}/api/media/${frameId}`, { headers: mine, data })
        expect(patch.status(), `patch ${JSON.stringify(data)}`).toBe(403)
      }
      const gone = await page.request.delete(`${API}/api/media/${frameId}`, { headers: mine })
      expect(gone.status(), 'delete').toBe(403)

      // the bulk routes take a where; the same rule meets them and they touch nothing
      const bulkPatch = await page.request.patch(`${API}/api/media?where[id][equals]=${frameId}`, {
        headers: mine,
        data: { visibility: 'public' },
      })
      expect(((await bulkPatch.json()) as { docs?: unknown[] }).docs ?? [], 'bulk patch').toEqual([])
      const bulkDelete = await page.request.delete(`${API}/api/media?where[id][equals]=${frameId}`, { headers: mine })
      expect(((await bulkDelete.json()) as { docs?: unknown[] }).docs ?? [], 'bulk delete').toEqual([])

    })

    await test.step('an entry cannot be made of, or grown by, a file picked by id', async () => {
      // through the collection an entry lets its submitter view the frames
      // and takes them out of public view: only for their own uploads
      expect(theirUpload, 'the second account uploaded a public file').toBeTruthy()
      const borrowed = await retryOnReset(() =>
        page.request.post(`${API}/api/submissions`, {
          headers: mine,
          data: { photocall: call.id, images: [theirUpload], agreedToTerms: true },
        }),
      )
      expect(borrowed.status(), 'a new entry made of it').toBe(400)
      const grown = await page.request.patch(`${API}/api/submissions/${entryId}`, {
        headers: mine,
        data: { images: [frameId, theirUpload] },
      })
      expect(grown.status(), 'their own entry, with it added').toBe(400)

      const stillPublic = await request.get(`${API}/api/media/${theirUpload}?depth=0`)
      expect(stillPublic.status(), 'the file stays public').toBe(200)
      const entry = await request.get(`${API}/api/submissions/${entryId}?depth=0`, { headers: adminHeaders() })
      expect(((await entry.json()) as { images: number[] }).images, 'and the entry keeps its one frame').toEqual([frameId])
    })

    await test.step('the frame is as it was sent', async () => {
      const again = await request.get(`${API}/api/media/${frameId}?depth=0`, { headers: adminHeaders() })
      expect(again.status()).toBe(200)
      const after = (await again.json()) as MediaDoc
      expect(after.visibility).toBe('restricted')
      expect(after.alt).toBe(before.alt)
      expect(after.credit).toBe(before.credit)
      expect(after.filename).toBe(before.filename)
      const file = await request.get(fileUrl(before.filename), { headers: adminHeaders() })
      expect(file.status(), 'the file is still there for the editors').toBe(200)
      expect((await request.get(fileUrl(before.filename))).status(), 'and still not public').toBe(403)
    })
  } finally {
    await otherContext.close()
    await deleteEntries(request, email)
    await deleteUserByEmail(request, email)
    await deleteUserByEmail(request, otherEmail)
  }
})

test('the account behind a profile is not public, and the member still reaches their own profile', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000) // sign-up, verify, join, activate
  const email = freshEmail('owner-field')

  try {
    await signUpAndVerify(page, request, email, 'E2E Owner')
    await joinAndActivate(page, request)
    const mine = origin(page)

    // the lookup the account pages make: the session, with the profile inside
    const me = await retryOnReset(() => page.request.get(`${API}/api/users/me?depth=1`, { headers: mine }))
    const { user } = (await me.json()) as { user: { id: number; profile: { id: number; owner?: number } } }
    expect(user.profile?.id, 'an activated account has a profile').toBeTruthy()
    expect(user.profile.owner, 'the owner reads owner on their own profile').toBe(user.id)

    const own = await page.request.get(`${API}/api/people/${user.profile.id}?depth=1`, { headers: mine })
    expect(own.status()).toBe(200)
    expect(((await own.json()) as { owner?: number }).owner).toBe(user.id)

    // and the rule that lets them edit it still matches on owner
    const saved = await page.request.patch(`${API}/api/people/${user.profile.id}`, {
      headers: mine,
      data: { basedIn: 'Pretoria' },
    })
    expect(saved.status(), await saved.text()).toBe(200)
    expect(((await saved.json()) as { doc: { basedIn?: string } }).doc.basedIn).toBe('Pretoria')

    await test.step('anonymous: no owner on any profile, by list, by id or by query', async () => {
      const list = await request.get(`${API}/api/people?depth=0&limit=200`)
      expect(list.status()).toBe(200)
      const { docs } = (await list.json()) as { docs: Record<string, unknown>[] }
      expect(docs.length).toBeGreaterThan(0)
      expect(docs.map((d) => d.id), 'the profile itself stays public').toContain(user.profile.id)
      for (const doc of docs) expect(doc, `person ${String(doc.id)}`).not.toHaveProperty('owner')

      const one = await request.get(`${API}/api/people/${user.profile.id}?depth=1`)
      expect(one.status()).toBe(200)
      expect(await one.json()).not.toHaveProperty('owner')

      // a field nobody may read is not one to filter or sort by either
      const probe = await request.get(`${API}/api/people?where[owner][equals]=${user.id}&depth=0`)
      expect(probe.status(), 'filter by owner').toBe(400)
      const sorted = await request.get(`${API}/api/people?sort=owner&depth=0`)
      expect(sorted.status(), 'sort by owner').toBe(400)
    })

    await test.step('a member sees owner on their own profile only', async () => {
      const list = await page.request.get(`${API}/api/people?depth=0&limit=200`, { headers: mine })
      const { docs } = (await list.json()) as { docs: Record<string, unknown>[] }
      const withOwner = docs.filter((d) => 'owner' in d && d.owner != null)
      expect(withOwner.map((d) => d.id)).toEqual([user.profile.id])
      const probe = await page.request.get(`${API}/api/people?where[owner][equals]=1&depth=0`, { headers: mine })
      expect(probe.status(), 'a member does not filter by owner either').toBe(400)
    })
  } finally {
    await deleteUserByEmail(request, email)
  }
})
