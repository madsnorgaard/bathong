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
  await page.goto('/account/sign-up')
  await page.getByLabel(/^Name/).fill(name)
  await page.getByLabel(/^Email/).fill(email)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Make my account/ }).click()
  await expect(page.getByText('Check your inbox.')).toBeVisible()
  const token = await verificationToken(request, email)
  await page.goto(`/account/verify?token=${encodeURIComponent(token)}`)
  await expect(page.getByText('Confirmed.', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.goto('/account/sign-in', { waitUntil: 'networkidle' })
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
  if (docs[0]) await request.delete(`${API}/api/users/${docs[0].id}`, { headers: adminHeaders() })
}
