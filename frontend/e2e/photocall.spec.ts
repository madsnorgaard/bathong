import { test, expect, type APIRequestContext } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { API, adminHeaders, deleteUserByEmail, freshEmail, gotoHydrated, signUpAndVerify } from './helpers/account'

/**
 * The photocall flow (W6): the signal plate, the three lines that remove the
 * excuse, and a real anonymous entry with files through the hardened
 * endpoint. A signed-in member's entry is theirs: it shows on their desk,
 * and a members-only call lets them in. Runs against the SEED_DEMO open call.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')

/** Entries (and their restricted frames) the suite made for one account or call. */
async function deleteEntries(request: APIRequestContext, where: string) {
  const list = await request.get(`${API}/api/submissions?${where}&depth=0&limit=20`, { headers: adminHeaders() })
  const { docs } = (await list.json()) as { docs: { id: number; images?: number[] }[] }
  for (const entry of docs ?? []) {
    await request.delete(`${API}/api/submissions/${entry.id}`, { headers: adminHeaders() })
    for (const image of entry.images ?? []) {
      await request.delete(`${API}/api/media/${image}`, { headers: adminHeaders() })
    }
  }
}

test('the page carries the signal plate and the three lines', async ({ page }) => {
  await page.goto('/photocalls')
  await expect(page.locator('.chapter--signal')).toBeVisible()
  await expect(page.getByText('anyone, member or not')).toBeVisible()
  await expect(page.getByText('What it costs')).toBeVisible()
  await expect(page.getByText('What you keep')).toBeVisible()
  await expect(page.getByText(/written response, frame by frame/).first()).toBeVisible()
})

test('the homepage signal strip is the door to the open call', async ({ page }) => {
  await page.goto('/')
  const signal = page.locator('.call-signal')
  await expect(signal).toBeVisible()
  await signal.getByRole('link', { name: /Submit/ }).click()
  await expect(page).toHaveURL(/\/photocalls/)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Demo: open call')
})

test('an anonymous entry with two frames goes through and confirms in writing', async ({ page }) => {
  await page.goto('/photocalls', { waitUntil: 'networkidle' })

  await page.getByLabel(/^Name/).fill('Playwright Entrant')
  await page.getByLabel(/^Email/).fill(`entry-${Date.now()}@example.org`)
  await page.getByLabel(/Where you shoot/).fill('Mamelodi')
  await page
    .locator('#frames')
    .setInputFiles([path.join(FIXTURES, 'entry-1.jpg'), path.join(FIXTURES, 'entry-2.jpg')])
  await expect(page.getByText(/01 · entry-1\.jpg/)).toBeVisible()
  await page.getByLabel(/I agree to the photocall terms/).check()
  await page.getByRole('button', { name: /Send it/ }).click()

  await expect(page.getByText(/In\. 2 frames received\./)).toBeVisible({ timeout: 20000 })
  await expect(page.getByText(/You keep your copyright/)).toBeVisible()
})

test('the send button stays disabled until the terms are agreed', async ({ page }) => {
  await page.goto('/photocalls', { waitUntil: 'networkidle' })
  await page.getByLabel(/^Name/).fill('No Terms')
  await page.getByLabel(/^Email/).fill('noterms@example.org')
  await page.locator('#frames').setInputFiles([path.join(FIXTURES, 'entry-1.jpg')])
  await expect(page.getByRole('button', { name: /Send it/ })).toBeDisabled()
})

test('a signed-in member\'s entry is theirs: it shows on their desk', async ({ page, request }) => {
  test.setTimeout(90_000)
  const email = freshEmail('entry')
  try {
    await signUpAndVerify(page, request, email, 'E2E Entrant')
    // fresh account: the desk has no entries yet
    await expect(page.getByText(/Nothing yet\. The next open call/)).toBeVisible()

    await gotoHydrated(page, '/photocalls')
    await page.getByLabel(/^Name/).fill('E2E Entrant')
    await page.getByLabel(/^Email/).fill(email)
    await page.locator('#frames').setInputFiles([path.join(FIXTURES, 'entry-1.jpg')])
    await page.getByLabel(/I agree to the photocall terms/).check()
    await page.getByRole('button', { name: /Send it/ }).click()
    await expect(page.getByText(/In\. 1 frame received\./)).toBeVisible({ timeout: 20_000 })

    // the desk lists only entries whose submitter is this account
    await page.goto('/account')
    const entries = page.locator('section.list', { hasText: 'Photocall entries' })
    await expect(entries.getByText('Demo: open call', { exact: true })).toBeVisible()
    await expect(entries.getByText(/1 frame/)).toBeVisible()
  } finally {
    await deleteEntries(request, `where[submitterEmail][equals]=${encodeURIComponent(email)}`)
    await deleteUserByEmail(request, email)
  }
})

test('a members-only call turns an anonymous entry away and takes a signed-in one', async ({
  page,
  request,
  playwright,
  baseURL,
}) => {
  test.setTimeout(90_000)
  const email = freshEmail('members-only')
  // A second open call beside the demo one. Opened long ago and closing far
  // off, so the page (newest opensAt) and the card (soonest closesAt) keep
  // showing the demo call while this one exists.
  const created = await request.post(`${API}/api/photocalls`, {
    headers: adminHeaders(),
    data: {
      title: `E2E members only ${Date.now()}`,
      opensAt: '2020-01-01T00:00:00.000Z',
      closesAt: '2099-01-01T00:00:00.000Z',
      membersOnly: true,
      status: 'open',
      _status: 'published',
    },
  })
  expect(created.ok(), `create call: ${created.status()}`).toBeTruthy()
  const callId = ((await created.json()) as { doc: { id: number } }).doc.id

  const entry = (who: string) => ({
    photocall: String(callId),
    name: who,
    email,
    agreedToTerms: 'true',
    frames: {
      name: 'entry-1.jpg',
      mimeType: 'image/jpeg',
      buffer: readFileSync(path.join(FIXTURES, 'entry-1.jpg')),
    },
  })
  // Payload takes the session cookie only from an origin on its csrf list
  const origin = new URL(baseURL!).origin

  try {
    // no session: the door is shut, and nothing is stored
    const anonymous = await playwright.request.newContext()
    const refused = await anonymous.post(`${API}/api/photocall-entries`, {
      multipart: entry('Anonymous'),
      headers: { Origin: origin },
    })
    await anonymous.dispose()
    expect(refused.status()).toBe(403)
    expect(await refused.text()).toContain('members only')

    // the same entry with the member's session cookie goes through
    await signUpAndVerify(page, request, email, 'E2E Member')
    const accepted = await page.request.post(`${API}/api/photocall-entries`, {
      multipart: entry('E2E Member'),
      headers: { Origin: origin },
    })
    expect(accepted.status(), await accepted.text()).toBe(201)
  } finally {
    await deleteEntries(request, `where[photocall][equals]=${callId}`)
    await request.delete(`${API}/api/photocalls/${callId}`, { headers: adminHeaders() })
    await deleteUserByEmail(request, email)
  }
})
