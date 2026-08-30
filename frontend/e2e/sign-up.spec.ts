import { expect, test } from '@playwright/test'
import { API, PASSWORD, deleteUserByEmail, freshEmail, gotoHydrated, verificationToken } from './helpers/account'

/**
 * Making an account (anyone can join): the form, the same answer for a known
 * address, the verify gate on sign-in, the confirmation link, and the
 * hardening around it (roles cannot be injected, unlock is admin-only, the
 * password rule holds). Needs E2E_HOOKS=true on the backend.
 */

const made: string[] = []
test.afterAll(async ({ request }) => {
  for (const email of made) await deleteUserByEmail(request, email)
})

test('sign up, confirm the email, sign in to the desk', async ({ page, request }) => {
  test.slow() // five page loads and three API round trips; tight at 30 s under load
  const email = freshEmail('signup')
  made.push(email)

  // unconfirmed: the sign-in refuses and offers the link again
  await gotoHydrated(page, '/account/sign-up')
  await page.getByLabel(/^Name/).fill('E2E Member')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Make my account/ }).click()
  await expect(page.getByText('Check your inbox.')).toBeVisible()
  await expect(page.getByText(email)).toBeVisible()

  await gotoHydrated(page, '/account/sign-in')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Sign in/ }).click()
  await expect(page.getByRole('alert')).toContainText(/Confirm your email first/)
  await expect(page.getByRole('button', { name: /Send it again/ })).toBeVisible()

  // confirm through the emailed token (read via the test door), then in
  const token = await verificationToken(request, email)
  await page.goto(`/account/verify?token=${encodeURIComponent(token)}`)
  await expect(page.getByText('Confirmed.', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('link', { name: /Sign in/ }).first().click()
  await page.waitForLoadState('networkidle')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Sign in/ }).click()
  await expect(page).toHaveURL(/\/account$/, { timeout: 15_000 })
  await expect(page.getByText('E2E Member')).toBeVisible()

  // a used link says so, and offers a new one
  await page.goto(`/account/verify?token=${encodeURIComponent(token)}`)
  await expect(page.getByText('That link did not work.')).toBeVisible({ timeout: 15_000 })
})

test('a known address gets the same success, never a hint', async ({ page }) => {
  await gotoHydrated(page, '/account/sign-up')
  await page.getByLabel(/^Name/).fill('Someone')
  await page.getByLabel(/^Email/).fill('member@bathong.local')
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Make my account/ }).click()
  await expect(page.getByText('Check your inbox.')).toBeVisible()
})

test('the password rule reads on the field and holds on the API', async ({ page, request }) => {
  await gotoHydrated(page, '/account/sign-up')
  await page.getByLabel(/^Email/).fill('rule@example.org')
  await page.getByLabel(/^Password/).fill('short')
  await expect(page.getByText('At least 10 characters.')).toBeVisible()
  await page.getByLabel(/^Password/).fill('rule@example.org')
  await expect(page.getByText('Your password cannot be your email.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Make my account/ })).toBeDisabled()

  const res = await request.post(`${API}/api/account/sign-up`, {
    data: { name: 'Rule', email: freshEmail('rule'), password: ' padded padded ' },
  })
  expect(res.status()).toBe(400)
  expect(JSON.stringify(await res.json())).toContain('spaces at the start or end')
})

test('roles cannot be injected, unlock is admin-only, the stock password PATCH is refused', async ({
  page,
  request,
}) => {
  const email = freshEmail('harden')
  made.push(email)
  const signup = await request.post(`${API}/api/account/sign-up`, {
    data: { name: 'Harden', email, password: PASSWORD, roles: ['admin'], _verified: true },
  })
  expect(signup.status()).toBe(200)

  // still unverified: the injected _verified did nothing
  const blocked = await request.post(`${API}/api/users/login`, { data: { email, password: PASSWORD } })
  expect(blocked.status()).toBe(403)

  await signUpAndVerifyByApi(request, email)
  const login = await request.post(`${API}/api/users/login`, { data: { email, password: PASSWORD } })
  expect(login.ok()).toBeTruthy()
  const { token, user } = (await login.json()) as { token: string; user: { id: number; roles: string[] } }
  expect(user.roles).toEqual(['member'])
  const auth = { Authorization: `JWT ${token}` }

  const unlock = await request.post(`${API}/api/users/unlock`, { headers: auth, data: { email: 'admin@bathong.local' } })
  expect(unlock.status()).toBe(403)

  const patchPassword = await request.patch(`${API}/api/users/${user.id}`, { headers: auth, data: { password: 'another long password' } })
  expect(patchPassword.status()).toBe(403)

  const patch = await request.patch(`${API}/api/users/${user.id}`, {
    headers: auth,
    data: { roles: ['admin'], email: 'evil@example.org', _verified: false, name: 'Harden Two' },
  })
  expect(patch.ok()).toBeTruthy()
  const me = (await (await request.get(`${API}/api/users/me`, { headers: auth })).json()) as { user: { roles: string[]; email: string; name: string } }
  expect(me.user.roles).toEqual(['member'])
  expect(me.user.email).toBe(email)
  expect(me.user.name).toBe('Harden Two')

  // and the browser side is untouched by all of that
  await page.goto('/privacy')
  await expect(page.getByRole('heading', { name: /^Privacy/ })).toBeVisible()
})

test('the test door is admin-only', async ({ request }) => {
  const anon = await request.get(`${API}/api/e2e/verification-token?email=member@bathong.local`)
  expect(anon.status()).toBe(403)
})

/** API-only confirm for the hardening test (no browser needed). */
async function signUpAndVerifyByApi(request: Parameters<typeof verificationToken>[0], email: string) {
  const token = await verificationToken(request, email)
  const res = await request.post(`${API}/api/users/verify/${encodeURIComponent(token)}`)
  expect(res.ok()).toBeTruthy()
}
