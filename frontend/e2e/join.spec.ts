import { expect, test } from '@playwright/test'
import { API, deleteUserByEmail, freshEmail, gotoHydrated, markPaid, signUpAndVerify } from './helpers/account'

/**
 * Joining by EFT: a fresh member picks a plan and gets a reference; an
 * editor marks the order paid; the desk shows the card and the number,
 * the account is active with a plan and an expiry, and renewal waits for
 * its window. Needs E2E_HOOKS=true and the SEED_DEMO prices.
 */

const made: string[] = []
test.afterAll(async ({ request }) => {
  for (const email of made) await deleteUserByEmail(request, email)
})

test('a new member joins on the annual plan, pays by reference, and gets a card and a number', async ({
  page,
  request,
}) => {
  test.slow() // sign-up, verify, join, mark paid, desk: tight at 30 s under load
  const email = freshEmail('join')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Joining Member')

  // no card yet: the desk offers the door
  await expect(page.locator('.b-card--member')).toContainText('No card yet')
  await page.getByRole('link', { name: /^Join$/ }).click()
  await expect(page).toHaveURL(/\/account\/join$/)
  await expect(page.getByRole('heading', { name: /Choose a plan/ })).toBeVisible()
  await expect(page.getByText('Plus R 250 to join, once.')).toBeVisible()

  await page.getByLabel(/Annual/).check()
  await page.getByRole('button', { name: /Give me the details/ }).click()
  await expect(page.getByRole('heading', { name: /Pay by EFT/ })).toBeVisible()
  const reference = (await page.locator('.reference').textContent())?.trim() ?? ''
  expect(reference).toMatch(/^BTG-[A-HJ-NP-Z2-9]{6}$/)
  await expect(page.locator('.amount')).toHaveText('R 1250')
  await expect(page.getByText(/R 250 of that is the joining fee/)).toBeVisible()

  // one open order: the page shows the same reference again
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('.reference')).toHaveText(reference)

  // changing plan moves the open order: same reference, new amount
  const origin = { Origin: new URL(page.url()).origin }
  const moved = await page.request.post(`${API}/api/account/join`, { data: { plan: 'monthly' }, headers: origin })
  expect(moved.status()).toBe(200)
  expect(await moved.json()).toMatchObject({ reference, plan: 'monthly', amount: 350, joiningFee: 250 })
  await page.reload({ waitUntil: 'networkidle' })
  await expect(page.locator('.amount')).toHaveText('R 350')
  const back = await page.request.post(`${API}/api/account/join`, { data: { plan: 'annual' }, headers: origin })
  expect(await back.json()).toMatchObject({ reference, plan: 'annual', amount: 1250 })
  await page.goto('/account')
  await expect(page.locator('.b-card--member')).toContainText(`Payment pending · ${reference}`)

  // the editor sees the EFT and marks the order paid
  const order = await markPaid(request, reference)
  expect(order.paidAt).toBeTruthy()
  const from = new Date(order.coveredFrom)
  const until = new Date(order.coveredUntil)
  expect(until.getUTCFullYear()).toBe(from.getUTCFullYear() + 1)

  await page.goto('/account', { waitUntil: 'networkidle' })
  const card = page.locator('.b-card--member')
  await expect(card).toContainText(/Member № \d{4}/)
  await expect(card).toContainText('Annual')
  await expect(card).toContainText(/since /)
  await expect(page.getByText(/Runs until/)).toBeVisible()
  await expect(page.getByText(/Welcome|Payments/).first()).toBeVisible()
  await expect(page.locator('.list', { hasText: 'Payments' })).toContainText('Paid')

  // renewal waits for the last 30 days
  await page.goto('/account/join', { waitUntil: 'networkidle' })
  await expect(page.getByText(/Your membership runs until/)).toBeVisible()
  await expect(page.getByText(/Renewal opens 30 days before/)).toBeVisible()

  // the account itself
  const login = await request.post(`${API}/api/users/login`, { data: { email, password: 'a long enough e2e password' } })
  const { token, user: me } = (await login.json()) as {
    token: string
    user: { membershipStatus: string; membershipPlan: string; memberSince: string; profile: { id: number; memberNumber: number; onRoster: boolean; owner: number } }
  }
  expect(me.membershipStatus).toBe('active')
  expect(me.membershipPlan).toBe('annual')
  expect(me.memberSince).toBeTruthy()
  expect(me.profile.memberNumber).toBeGreaterThan(4)
  expect(me.profile.onRoster).toBe(false)

  // the member edits their own profile, within the rules: links are
  // http(s) only, the roster needs a portrait, the number is not theirs to set
  const own = (data: Record<string, unknown>) =>
    request.patch(`${API}/api/people/${me.profile.id}`, { headers: { Authorization: `JWT ${token}` }, data })
  expect((await own({ website: 'javascript:alert(1)' })).status()).toBe(400)
  expect((await own({ website: 'https://example.org/work', instagram: '@joining.member' })).status()).toBe(200)
  expect((await own({ onRoster: true })).status()).toBe(400)
  const numbered = await own({ memberNumber: 1 })
  expect(numbered.status()).toBe(200)
  const after = (await numbered.json()).doc as { memberNumber: number; instagram: string }
  expect(after.memberNumber).toBe(me.profile.memberNumber)
  expect(after.instagram).toBe('https://www.instagram.com/joining.member/')
})

test('a signed-in RSVP lands on the desk', async ({ page, request }) => {
  test.slow() // sign-up, verify, sign-in, RSVP, desk: tight at 30 s under load
  const email = freshEmail('rsvp')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Walking Member')
  // hydration, not networkidle: the walk map keeps fetching tiles
  await gotoHydrated(page, '/walks/demo-next-walk')
  await expect(page.getByLabel(/^Name/)).toHaveValue('Walking Member')
  await expect(page.getByLabel(/^Email/)).toHaveValue(email)
  await page.getByRole('button', { name: /Reserve a place/ }).click()
  await expect(page.getByText(/on the list|waitlist/)).toBeVisible()
  await page.goto('/account', { waitUntil: 'networkidle' })
  await expect(page.locator('.list', { hasText: 'Your RSVPs' })).toContainText('Demo: the next loop')
})
