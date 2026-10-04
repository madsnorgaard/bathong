import { test, expect } from '@playwright/test'
import { gotoHydrated } from './helpers/account'

/**
 * Member sign-in from the site (#13). Runs against the SEED_DEMO member
 * (backend/src/seed/seed.ts); the password matches the local seed default
 * unless SEED_MEMBER_PASSWORD says otherwise (ci.yml sets its own).
 */
const EMAIL = 'member@bathong.local'
const PASSWORD = process.env.SEED_MEMBER_PASSWORD ?? 'bathong-member-dev'

test('the account page sends anonymous visitors to sign in, and back again', async ({ page }) => {
  await page.goto('/account')
  await expect(page).toHaveURL(/\/account\/sign-in\?next=(%2F|\/)account/)
  await expect(page.getByRole('heading', { name: /Sign in/ })).toBeVisible()
})

test('a member signs in, lands on the account page, and can sign out', async ({ page }) => {
  // hydrated: typing before hydration is lost when Vue takes the form over
  await gotoHydrated(page, '/account/sign-in')
  await page.getByLabel(/^Email/).fill(EMAIL)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Sign in/ }).click()

  // Generous: under a full parallel run the dev backend answers the login
  // and the account page's SSR read well after the default 5s.
  await expect(page).toHaveURL(/\/account$/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name: 'Desk.' })).toBeVisible()
  await expect(page.getByText('Demo Member')).toBeVisible()
  // one membership, no tiers: the card shows the plan the member pays by
  await expect(page.locator('.b-card--member')).toContainText('Monthly')
  await expect(page.locator('.b-card--member')).toContainText(/Member № \d{4}/)
  await expect(page.getByRole('link', { name: /Account/ }).first()).toBeVisible()
  // an active member is through the door: Account is the one link, no Join
  // in the header or on the desk's own nav
  await expect(page.locator('header.nav').getByRole('link', { name: /Join/ })).toHaveCount(0)
  await expect(page.locator('nav[aria-label="Account"] a')).toHaveText(['Desk', 'Profile', 'Security'])

  await page.getByRole('button', { name: /Sign out/ }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: /Sign in/ }).first()).toBeVisible()
  // anonymous again: Join is back and leads to making an account
  await expect(page.locator('header.nav').getByRole('link', { name: /Join/ })).toHaveAttribute('href', '/account/sign-up')

  await page.goto('/account')
  await expect(page).toHaveURL(/\/account\/sign-in/)
})

test('a wrong password shows an error and stays on the page', async ({ page }) => {
  // hydrated: typing before hydration is lost when Vue takes the form over
  await gotoHydrated(page, '/account/sign-in')
  await page.getByLabel(/^Email/).fill(EMAIL)
  await page.getByLabel(/^Password/).fill('not-the-password')
  await page.getByRole('button', { name: /Sign in/ }).click()
  await expect(page.getByRole('alert')).toContainText(/do not match/)
  await expect(page).toHaveURL(/\/account\/sign-in/)
})

test('the session survives a full reload (SSR reads the cookie)', async ({ page }) => {
  // hydrated: typing before hydration is lost when Vue takes the form over
  await gotoHydrated(page, '/account/sign-in')
  await page.getByLabel(/^Email/).fill(EMAIL)
  await page.getByLabel(/^Password/).fill(PASSWORD)
  await page.getByRole('button', { name: /Sign in/ }).click()
  await expect(page).toHaveURL(/\/account$/, { timeout: 15_000 })
  await page.reload()
  await expect(page.getByText('Demo Member')).toBeVisible()
})
