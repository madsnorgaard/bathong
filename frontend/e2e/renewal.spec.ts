import { test, expect } from '@playwright/test'
import { API, adminHeaders, deleteUserByEmail, freshEmail, joinAndActivate, markPaid, signUpAndVerify } from './helpers/account'

/**
 * Renewal reminders and the lapse notice (#83): the nightly job, run through
 * the e2e door on chosen days around a membership's expiry. It records one
 * row per notice and never sends twice; the reminder opens the member's one
 * renewal order, the same reference the join page shows. Needs E2E_HOOKS.
 */

const made: string[] = []
test.afterAll(async ({ request }) => {
  for (const email of made) await deleteUserByEmail(request, email)
})

const day = 86_400_000
const dayBefore = (iso: string, days: number) => new Date(new Date(iso).getTime() - days * day).toISOString()
const dayAfter = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * day).toISOString()

type Notice = { kind: string; outcome: string; expires: string }
type Run = { checked: number; sent: { userId: number; kind: string }[] }

test('a member is reminded at 30 and 7 days with one reference, then told the membership lapsed', async ({ page, request }) => {
  test.slow()
  const email = freshEmail('renewal')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Renewing Member')
  await joinAndActivate(page, request, 'monthly')
  const me = await page.request.get(`${API}/api/users/me?depth=0`, { headers: { Origin: new URL(page.url()).origin } })
  const { user } = (await me.json()) as { user: { id: number; membershipExpires: string } }
  const until = user.membershipExpires
  expect(until).toBeTruthy()

  const runOn = async (now: string) => {
    const res = await request.post(`${API}/api/e2e/membership-notices`, { headers: adminHeaders(), data: { now } })
    expect(res.status(), await res.text()).toBe(200)
    const run = (await res.json()) as Run
    return run.sent.filter((s) => s.userId === user.id).map((s) => s.kind)
  }
  const notices = async () => {
    const res = await request.get(`${API}/api/membership-notices?where[user][equals]=${user.id}&depth=0&sort=sentAt`, {
      headers: adminHeaders(),
    })
    return ((await res.json()) as { docs: Notice[] }).docs.map((n) => `${n.kind}:${n.outcome}`)
  }
  const openOrders = async () => {
    const res = await request.get(
      `${API}/api/orders?where[user][equals]=${user.id}&where[status][equals]=pending&depth=0`,
      { headers: adminHeaders() },
    )
    return ((await res.json()) as { docs: { reference: string; plan: string }[] }).docs
  }

  // well before the window: nothing
  expect(await runOn(dayBefore(until, 40))).toEqual([])
  expect(await openOrders()).toHaveLength(0)

  // 20 days out: the 30-day reminder, and the renewal order it quotes
  expect(await runOn(dayBefore(until, 20))).toEqual(['reminder-30'])
  const [order] = await openOrders()
  expect(order).toMatchObject({ plan: 'monthly' })
  expect(order.reference).toMatch(/^BTG-[A-HJ-NP-Z2-9]{6}$/)

  // the next morning: nothing twice
  expect(await runOn(dayBefore(until, 19))).toEqual([])
  expect(await notices()).toEqual(['reminder-30:sent'])

  // 3 days out: the 7-day reminder, the same open order
  expect(await runOn(dayBefore(until, 3))).toEqual(['reminder-7'])
  expect(await openOrders()).toMatchObject([{ reference: order.reference }])
  expect(await runOn(dayBefore(until, 2))).toEqual([])

  // the day of expiry nothing; the day after, the lapse notice
  expect(await runOn(dayAfter(until, 0.5))).toEqual([])
  expect(await runOn(dayAfter(until, 1.5))).toEqual(['lapsed'])
  expect(await runOn(dayAfter(until, 2.5))).toEqual([])
  expect(await notices()).toEqual(['reminder-30:sent', 'reminder-7:sent', 'lapsed:sent'])

  // the member's own door still works: paying the open order renews on the old expiry
  await markPaid(request, order.reference)
  const renewed = await page.request.get(`${API}/api/users/me?depth=0`, { headers: { Origin: new URL(page.url()).origin } })
  const after = ((await renewed.json()) as { user: { membershipExpires: string } }).user.membershipExpires
  expect(new Date(after).getTime()).toBeGreaterThan(new Date(until).getTime())
  // and the new expiry has no notices yet, so the job starts over for it
  expect(await runOn(dayBefore(after, 40))).toEqual([])
})

test('a member who was never reminded and has long lapsed gets the lapse notice alone', async ({ page, request }) => {
  test.slow()
  const email = freshEmail('renewal-late')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Late Member')
  await joinAndActivate(page, request, 'monthly')
  const me = await page.request.get(`${API}/api/users/me?depth=0`, { headers: { Origin: new URL(page.url()).origin } })
  const { user } = (await me.json()) as { user: { id: number; membershipExpires: string } }

  const res = await request.post(`${API}/api/e2e/membership-notices`, {
    headers: adminHeaders(),
    data: { now: dayAfter(user.membershipExpires, 20) },
  })
  expect(res.status()).toBe(200)
  const run = (await res.json()) as Run
  expect(run.sent.filter((s) => s.userId === user.id).map((s) => s.kind)).toEqual(['lapsed'])
  const list = await request.get(`${API}/api/membership-notices?where[user][equals]=${user.id}&depth=0&sort=kind`, {
    headers: adminHeaders(),
  })
  const docs = ((await list.json()) as { docs: Notice[] }).docs.map((n) => `${n.kind}:${n.outcome}`).sort()
  expect(docs).toEqual(['lapsed:sent', 'reminder-30:overtaken', 'reminder-7:overtaken'])
})
