import { expect, test, type APIRequestContext } from '@playwright/test'
import { API, adminHeaders, deleteUserByEmail, freshEmail, signUpAndVerify } from './helpers/account'

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

async function markPaid(request: APIRequestContext, reference: string) {
  const list = await request.get(`${API}/api/orders?where[reference][equals]=${reference}&depth=0&limit=1`, {
    headers: adminHeaders(),
  })
  const { docs } = (await list.json()) as { docs: { id: number }[] }
  expect(docs[0], `order ${reference}`).toBeTruthy()
  const res = await request.patch(`${API}/api/orders/${docs[0].id}`, {
    headers: adminHeaders(),
    data: { status: 'paid', note: 'e2e: EFT seen' },
  })
  expect(res.ok(), `mark paid: ${res.status()}`).toBeTruthy()
  return (await res.json()).doc as { coveredFrom: string; coveredUntil: string; paidAt: string }
}

test('a new member joins on the annual plan, pays by reference, and gets a card and a number', async ({
  page,
  request,
}) => {
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
  const me = (await login.json()).user as { membershipStatus: string; membershipPlan: string; memberSince: string; profile: { memberNumber: number; onRoster: boolean; owner: number } }
  expect(me.membershipStatus).toBe('active')
  expect(me.membershipPlan).toBe('annual')
  expect(me.memberSince).toBeTruthy()
  expect(me.profile.memberNumber).toBeGreaterThan(4)
  expect(me.profile.onRoster).toBe(false)
})

test('a signed-in RSVP lands on the desk', async ({ page, request }) => {
  const email = freshEmail('rsvp')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Walking Member')
  await page.goto('/walks/demo-next-walk', { waitUntil: 'networkidle' })
  await expect(page.getByLabel(/^Name/)).toHaveValue('Walking Member')
  await expect(page.getByLabel(/^Email/)).toHaveValue(email)
  await page.getByRole('button', { name: /Reserve a place/ }).click()
  await expect(page.getByText(/on the list|waitlist/)).toBeVisible()
  await page.goto('/account', { waitUntil: 'networkidle' })
  await expect(page.locator('.list', { hasText: 'Your RSVPs' })).toContainText('Demo: the next loop')
})
