import { expect, type APIRequestContext, type Page } from '@playwright/test'

/**
 * Account helpers for the e2e suite. Tokens that only travel by email are
 * read through the admin-only test door (E2E_HOOKS=true on the backend,
 * global-setup.ts provides the admin token).
 */
export const API = process.env.PAYLOAD_URL ?? 'http://localhost:3001'

export const adminHeaders = () => {
  const token = process.env.E2E_ADMIN_TOKEN
  expect(token, 'E2E_ADMIN_TOKEN from global-setup').toBeTruthy()
  return { Authorization: `JWT ${token}` }
}

export const freshEmail = (tag: string) =>
  `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.org`

export const PASSWORD = 'a long enough e2e password'

/**
 * Open a page and wait until Vue has taken it over. Typing before that is
 * lost, and `networkidle` is not a hydration signal under load. Vue sets
 * `__vue_app__` on the root when it mounts, and Nuxt clears `isHydrating`
 * once the tree is live; wait for both.
 */
export async function gotoHydrated(page: Page, path: string) {
  await page.goto(path)
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as (Element & { __vue_app__?: unknown }) | null
    const nuxt = (window as unknown as { useNuxtApp?: () => { isHydrating?: boolean } }).useNuxtApp?.()
    return Boolean(root?.__vue_app__) && nuxt?.isHydrating !== true
  })
}

export async function verificationToken(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(`${API}/api/e2e/verification-token?email=${encodeURIComponent(email)}`, {
    headers: adminHeaders(),
  })
  expect(res.ok(), `verification token hook: ${res.status()}`).toBeTruthy()
  const { token } = (await res.json()) as { token: string | null }
  expect(token, 'a verification token exists').toBeTruthy()
  return token as string
}

/** Sign up on the site, confirm through the hook token, and leave the browser signed in. */
export async function signUpAndVerify(page: Page, request: APIRequestContext, email: string, name = 'E2E Member') {
  await gotoHydrated(page, '/account/sign-up')
  await page.getByLabel(/^Name/).fill(name)
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Make my account/ }).click()
  await expect(page.getByText('Check your inbox.')).toBeVisible()
  const token = await verificationToken(request, email)
  await page.goto(`/account/verify?token=${encodeURIComponent(token)}`)
  await expect(page.getByText('Confirmed.', { exact: true })).toBeVisible({ timeout: 15_000 })
  await gotoHydrated(page, '/account/sign-in')
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Sign in/ }).click()
  await expect(page).toHaveURL(/\/account$/, { timeout: 15_000 })
}

/** Remove an account the suite made (admin), so reruns stay clean. */
export async function deleteUserByEmail(request: APIRequestContext, email: string) {
  const list = await request.get(`${API}/api/users?where[email][equals]=${encodeURIComponent(email)}&depth=0&limit=1`, {
    headers: adminHeaders(),
  })
  const { docs } = (await list.json()) as { docs: { id: number }[] }
  if (!docs[0]) return
  // an activated account owns a profile and maybe a portrait; deleting the
  // user alone would orphan both
  await request.delete(`${API}/api/people?where[owner][equals]=${docs[0].id}`, { headers: adminHeaders() })
  await request.delete(`${API}/api/media?where[uploadedBy][equals]=${docs[0].id}`, { headers: adminHeaders() })
  await request.delete(`${API}/api/users/${docs[0].id}`, { headers: adminHeaders() })
}

/** The token an email change is waiting on, read by the account's current address. */
export async function pendingEmailToken(request: APIRequestContext, email: string): Promise<string> {
  const res = await request.get(`${API}/api/e2e/verification-token?email=${encodeURIComponent(email)}`, {
    headers: adminHeaders(),
  })
  expect(res.ok(), `test door: ${res.status()}`).toBeTruthy()
  const { pendingEmailToken: token } = (await res.json()) as { pendingEmailToken: string | null }
  expect(token, 'pending email token').toBeTruthy()
  return token as string
}

/** The editor sees the EFT and marks the order paid; activation follows. */
export async function markPaid(request: APIRequestContext, reference: string) {
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

/**
 * Join through the signed-in page session and have the editor mark it paid,
 * so the account has a profile and a number. Returns the reference.
 */
export async function joinAndActivate(page: Page, request: APIRequestContext, plan: 'monthly' | 'annual' = 'monthly') {
  const res = await page.request.post(`${API}/api/account/join`, {
    data: { plan },
    headers: { Origin: new URL(page.url()).origin },
  })
  expect(res.status(), 'join').toBe(201)
  const { reference } = (await res.json()) as { reference: string }
  await markPaid(request, reference)
  return reference
}
