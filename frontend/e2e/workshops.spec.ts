import { expect, test } from '@playwright/test'
import {
  API,
  adminHeaders,
  deleteUserByEmail,
  freshEmail,
  gotoHydrated,
  signUpAndVerify,
} from './helpers/account'

/**
 * Workshops: the taught side of the programme, booked through the same RSVP
 * mechanism as walks. Runs against the SEED_DEMO fixtures: demo-next-workshop
 * (the RSVP target), demo-small-workshop (capacity 1, the waitlist target)
 * and demo-past-workshop (held, carrying the demo gallery).
 */

const madeUsers: string[] = []
const rsvpEmails: string[] = []
test.afterAll(async ({ request }) => {
  for (const email of madeUsers) await deleteUserByEmail(request, email)
  for (const email of rsvpEmails) {
    await request.delete(`${API}/api/rsvps?where[email][equals]=${encodeURIComponent(email)}`, {
      headers: adminHeaders(),
    })
  }
})

async function workshopId(request: import('@playwright/test').APIRequestContext, slug: string) {
  const res = await request.get(
    `${API}/api/workshops?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0`,
  )
  const body = (await res.json()) as { docs: { id: number }[] }
  return body.docs[0].id
}

test('the workshops index is the next workshop: plate, venue, price, practical lines, RSVP', async ({ page }) => {
  await page.goto('/workshops')
  await expect(page.getByText(/Next workshop · № \d{3}/)).toBeVisible()
  await expect(page.getByText('Demo venue, Pretoria').first()).toBeVisible()
  await expect(page.getByText(/R\s?400.*per person/).first()).toBeVisible()
  await expect(page.getByText('Bring your empty tins with lids.').first()).toBeVisible()
  await expect(page.locator('#rsvp')).toBeVisible()
  // the invite card opens the full poster in its own tab
  const invite = page.locator('a.invite')
  await expect(invite).toBeVisible()
  await expect(invite).toHaveAttribute('href', /\/api\/media\//)
  await expect(invite).toHaveAttribute('target', '_blank')
  await expect(invite.getByText('Open the full invite →')).toBeVisible()
  // who runs it, and with whom: several partners, logos on the paper ground
  await expect(page.getByText(/Facilitated by/)).toBeVisible()
  const partners = page.locator('.partners')
  await expect(partners.getByText('Demo partner one')).toBeVisible()
  await expect(partners.getByText('Demo partner two')).toBeVisible()
  await expect(partners.locator('img.logo')).toHaveCount(1)
})

test('an anonymous RSVP on the workshop page lands on the list', async ({ page }) => {
  const email = freshEmail('workshop-rsvp')
  rsvpEmails.push(email)
  await gotoHydrated(page, '/workshops/demo-next-workshop')
  await page.getByLabel(/^Name/).fill('Workshop Guest')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByRole('button', { name: /Reserve a place/ }).click()
  await expect(page.getByText(/on the list/)).toBeVisible()
  await expect(page.getByText('Bring your empty tins with lids.').first()).toBeVisible()
})

test('a capacity-1 workshop confirms one place and waitlists the next', async ({ request }) => {
  const id = await workshopId(request, 'demo-small-workshop')
  const first = freshEmail('workshop-first')
  const second = freshEmail('workshop-second')
  rsvpEmails.push(first, second)

  const a = await request.post(`${API}/api/rsvps`, {
    data: { workshop: id, name: 'First In', email: first },
  })
  expect(a.status()).toBe(201)
  expect(((await a.json()) as { doc: { status: string } }).doc.status).toBe('confirmed')

  const b = await request.post(`${API}/api/rsvps`, {
    data: { workshop: id, name: 'Second In', email: second },
  })
  expect(b.status()).toBe(201)
  expect(((await b.json()) as { doc: { status: string } }).doc.status).toBe('waitlist')

  // the same email cannot hold two places on one workshop
  const dup = await request.post(`${API}/api/rsvps`, {
    data: { workshop: id, name: 'First In', email: first },
  })
  expect(dup.status()).toBe(400)
})

test('an RSVP names exactly one event, and a held workshop takes none', async ({ request }) => {
  const workshop = await workshopId(request, 'demo-next-workshop')
  const past = await workshopId(request, 'demo-past-workshop')
  const walkRes = await request.get(
    `${API}/api/walks?where[slug][equals]=demo-next-walk&limit=1&depth=0`,
  )
  const walk = ((await walkRes.json()) as { docs: { id: number }[] }).docs[0].id

  const both = await request.post(`${API}/api/rsvps`, {
    data: { walk, workshop, name: 'Greedy', email: freshEmail('workshop-both') },
  })
  expect(both.status()).toBe(400)

  const neither = await request.post(`${API}/api/rsvps`, {
    data: { name: 'Lost', email: freshEmail('workshop-neither') },
  })
  expect(neither.status()).toBe(400)

  const closed = await request.post(`${API}/api/rsvps`, {
    data: { workshop: past, name: 'Late', email: freshEmail('workshop-late') },
  })
  expect(closed.status()).toBe(400)
})

test('a held workshop is the record: facts, facilitator, and its gallery', async ({ page }) => {
  await page.goto('/workshops/demo-past-workshop')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Demo: the workshop that was')
  await expect(page.getByText(/№ \d{3} · held/)).toBeVisible()
  await expect(page.getByText('Demo venue, Pretoria').first()).toBeVisible()
  // scoped to the facts list: the gallery card carries the same name
  await expect(page.locator('.facts').getByRole('link', { name: 'Alet Pretorius' })).toHaveAttribute(
    'href',
    '/photographers/alet-pretorius',
  )
  const galleryLink = page.getByRole('link', { name: /Demo: tins and paper/ })
  await expect(galleryLink).toHaveAttribute('href', '/albums/demo-workshop-album')
  await expect(galleryLink.getByText(/Alet Pretorius/).first()).toBeVisible()
})

test('an unknown workshop is a 404, not a blank page', async ({ page }) => {
  const res = await page.goto('/workshops/does-not-exist')
  expect(res?.status()).toBe(404)
})

test('a signed-in workshop RSVP lands on the desk', async ({ page, request }) => {
  test.slow() // sign-up, verify, sign-in, RSVP, desk: tight at 30 s under load
  const email = freshEmail('workshop-member')
  madeUsers.push(email)
  rsvpEmails.push(email)
  await signUpAndVerify(page, request, email, 'Workshop Member')
  await gotoHydrated(page, '/workshops/demo-next-workshop')
  await expect(page.getByLabel(/^Name/)).toHaveValue('Workshop Member')
  await expect(page.getByLabel(/^Email/)).toHaveValue(email)
  await page.getByRole('button', { name: /Reserve a place/ }).click()
  await expect(page.getByText(/on the list|waitlist/)).toBeVisible()
  await page.goto('/account', { waitUntil: 'networkidle' })
  await expect(page.locator('.list', { hasText: 'Your RSVPs' })).toContainText(
    'Demo: the next workshop',
  )
})
