import { expect, test, type Browser, type Page } from '@playwright/test'
import {
  API,
  PASSWORD,
  adminHeaders,
  deleteUserByEmail,
  freshEmail,
  gotoHydrated,
  joinAndActivate,
  pendingEmailToken,
  signUpAndVerify,
} from './helpers/account'

/**
 * The security page: the current password before any change, other
 * devices dropped on a password change, an email change that waits for the
 * new address, devices listed and signed out by name, and the door out,
 * which deletes the person and keeps the work credited. Needs E2E_HOOKS.
 */

const NEW_PASSWORD = 'another long enough password'
const made: string[] = []
const leftovers: { people: number[]; rsvps: string[] } = { people: [], rsvps: [] }
test.afterAll(async ({ request }) => {
  for (const email of made) await deleteUserByEmail(request, email)
  for (const id of leftovers.people) await request.delete(`${API}/api/people/${id}`, { headers: adminHeaders() })
  for (const email of leftovers.rsvps) {
    await request.delete(`${API}/api/rsvps?where[email][equals]=${encodeURIComponent(email)}`, { headers: adminHeaders() })
  }
})

const origin = (page: Page) => ({ Origin: new URL(page.url()).origin })
const whoAmI = async (page: Page) => {
  const res = await page.request.get(`${API}/api/users/me`, { headers: origin(page) })
  return ((await res.json()) as { user: { email: string } | null }).user
}

/** A second device: its own browser context, signed in through the site. */
async function secondDevice(browser: Browser, email: string, password: string) {
  const context = await browser.newContext()
  const page = await context.newPage()
  await gotoHydrated(page, '/account/sign-in')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(password)
  await page.getByRole('button', { name: /Sign in/ }).click()
  await expect(page).toHaveURL(/\/account$/, { timeout: 15_000 })
  return { context, page }
}

test('password: the current one is checked, the change signs other devices out, devices can be dropped by name', async ({
  page,
  request,
  browser,
}) => {
  test.slow()
  const email = freshEmail('security-pw')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Password Member')
  const other = await secondDevice(browser, email, PASSWORD)

  await gotoHydrated(page, '/account/security')
  await expect(page.getByText(/This device/)).toBeVisible()
  await expect(page.getByText(/Another device/)).toBeVisible()

  await page.getByLabel(/^Current password/).fill('not the password at all')
  await page.getByLabel(/^New password/).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: /Change password/ }).click()
  await expect(page.getByRole('alert')).toContainText('That is not your current password.')

  await page.getByLabel(/^Current password/).fill(PASSWORD)
  await page.getByLabel(/^New password/).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: /Change password/ }).click()
  await expect(page.getByText('Changed. Other devices were signed out.')).toBeVisible()
  expect(await whoAmI(other.page)).toBeNull()
  expect((await whoAmI(page))?.email).toBe(email)
  await expect(page.getByText(/Another device/)).toHaveCount(0)

  // the other device comes back with the new password, and is dropped by name
  await other.context.close()
  const again = await secondDevice(browser, email, NEW_PASSWORD)
  await gotoHydrated(page, '/account/security')
  await expect(page.getByText(/Another device/)).toBeVisible()
  await page.getByRole('button', { name: /^Sign out$/ }).first().click()
  await expect(page.getByText(/Another device/)).toHaveCount(0)
  expect(await whoAmI(again.page)).toBeNull()

  // and everywhere
  await page.getByRole('button', { name: /Sign out everywhere/ }).click()
  await expect(page).toHaveURL(/\/account\/sign-in/)
  expect(await whoAmI(page)).toBeNull()
  await again.context.close()
})

test('email: the change waits for the new address; then the old one is out and the new one is in', async ({ page, request }) => {
  test.slow()
  const email = freshEmail('security-em')
  const newEmail = freshEmail('security-em-new')
  made.push(email, newEmail)
  await signUpAndVerify(page, request, email, 'Email Member')

  await gotoHydrated(page, '/account/security')
  await page.getByLabel(/^New email/).fill(newEmail)
  await page.getByLabel(/^Your password/).first().fill('wrong password here')
  await page.getByRole('button', { name: /Change email/ }).click()
  await expect(page.getByRole('alert')).toContainText('That is not your current password.')

  await page.getByLabel(/^Your password/).first().fill(PASSWORD)
  await page.getByRole('button', { name: /Change email/ }).click()
  await expect(page.getByText(`Check ${newEmail}.`)).toBeVisible()
  // nothing changed yet
  expect((await whoAmI(page))?.email).toBe(email)

  const token = await pendingEmailToken(request, email)
  await page.goto(`/account/verify?kind=email&token=${encodeURIComponent(token)}`)
  await expect(page.getByText('Your new address is set.')).toBeVisible({ timeout: 15_000 })
  expect(await whoAmI(page)).toBeNull()

  const old = await request.post(`${API}/api/users/login`, { data: { email, password: PASSWORD } })
  expect(old.status()).toBe(401)
  const fresh = await request.post(`${API}/api/users/login`, { data: { email: newEmail, password: PASSWORD } })
  expect(fresh.status()).toBe(200)

  // a used link says so
  await page.goto(`/account/verify?kind=email&token=${encodeURIComponent(token)}`)
  await expect(page.getByText('That link did not work.')).toBeVisible({ timeout: 15_000 })
})

test('closing the account: the password is checked, the person goes, the work stays credited', async ({ page, request }) => {
  test.slow()
  const email = freshEmail('security-close')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Closing Member')
  await joinAndActivate(page, request)

  const walks = await request.get(`${API}/api/walks?where[slug][equals]=demo-next-walk&limit=1&depth=0`)
  const walk = ((await walks.json()) as { docs: { id: number }[] }).docs[0]
  const rsvp = await page.request.post(`${API}/api/rsvps`, {
    headers: origin(page),
    data: { walk: walk.id, name: 'Closing Member', email },
  })
  expect(rsvp.status()).toBe(201)
  const me = await page.request.get(`${API}/api/users/me?depth=1`, { headers: origin(page) })
  const { user } = (await me.json()) as { user: { id: number; profile: { id: number; memberNumber: number } } }
  leftovers.people.push(user.profile.id)
  leftovers.rsvps.push(`deleted-${user.id}@example.invalid`)

  await gotoHydrated(page, '/account/security')
  await page.getByLabel(/^Your password/).last().fill('wrong password here')
  await page.getByRole('button', { name: /Delete my account/ }).click()
  await page.getByRole('button', { name: /Yes, delete my account/ }).click()
  await expect(page.getByRole('alert')).toContainText('That is not your current password.')

  await page.getByLabel(/^Your password/).last().fill(PASSWORD)
  await page.getByRole('button', { name: /Delete my account/ }).click()
  await expect(page.getByText('Are you sure?')).toBeVisible()
  await page.getByRole('button', { name: /Yes, delete my account/ }).click()
  await expect(page.getByText('Your account is closed.')).toBeVisible()

  const login = await request.post(`${API}/api/users/login`, { data: { email, password: PASSWORD } })
  expect(login.status()).toBe(401)
  await page.goto('/account')
  await expect(page).toHaveURL(/\/account\/sign-in/)

  // the profile stays for the credits: no owner, off the roster, number kept
  const person = await request.get(`${API}/api/people/${user.profile.id}?depth=0`, { headers: adminHeaders() })
  const doc = (await person.json()) as { owner: number | null; onRoster: boolean; memberNumber: number; contactEmail?: string }
  expect(doc.owner).toBeNull()
  expect(doc.onRoster).toBe(false)
  expect(doc.memberNumber).toBe(user.profile.memberNumber)

  // the RSVP names nobody
  const rsvps = await request.get(
    `${API}/api/rsvps?where[email][equals]=${encodeURIComponent(`deleted-${user.id}@example.invalid`)}&depth=0`,
    { headers: adminHeaders() },
  )
  const rows = ((await rsvps.json()) as { docs: { name: string; user: number | null }[] }).docs
  expect(rows).toHaveLength(1)
  expect(rows[0].name).toBe('Former member')
  expect(rows[0].user).toBeNull()
  const byOld = await request.get(`${API}/api/rsvps?where[email][equals]=${encodeURIComponent(email)}&depth=0`, {
    headers: adminHeaders(),
  })
  expect(((await byOld.json()) as { docs: unknown[] }).docs).toHaveLength(0)
})

test('the doors need a session, and editors cannot close their own account', async ({ request }) => {
  for (const path of ['change-password', 'change-email', 'sessions/revoke', 'delete']) {
    const res = await request.post(`${API}/api/account/${path}`, { data: {} })
    expect(res.status(), path).toBe(401)
  }
  expect((await request.get(`${API}/api/account/sessions`)).status()).toBe(401)
  const asAdmin = await request.post(`${API}/api/account/delete`, { headers: adminHeaders(), data: { password: 'x' } })
  expect(asAdmin.status()).toBe(403)
})
