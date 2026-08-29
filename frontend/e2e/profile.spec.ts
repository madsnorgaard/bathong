import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { API, deleteUserByEmail, freshEmail, gotoHydrated, joinAndActivate, signUpAndVerify } from './helpers/account'

/**
 * The member's own page: no profile before membership; then the portrait
 * gate on the roster switch, an upload, the fields, the public page with
 * the portrait through the image proxy, and the rules the API holds on its
 * own (a portrait must be the member's upload). Needs E2E_HOOKS=true.
 */

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures')
const made: string[] = []
test.afterAll(async ({ request }) => {
  for (const email of made) await deleteUserByEmail(request, email)
})

test('a member fills in their profile, adds a portrait, and joins the roster', async ({ page, request }) => {
  test.slow() // sign-up, verify, join, activate, upload, two public pages
  const email = freshEmail('profile')
  made.push(email)
  await signUpAndVerify(page, request, email, 'Profile Member')

  // before membership: the page is honest about it
  await gotoHydrated(page, '/account/profile')
  await expect(page.getByText('Your profile arrives with your membership.')).toBeVisible()
  await expect(page.getByRole('main').getByRole('link', { name: 'Join →' })).toBeVisible()

  await joinAndActivate(page, request)

  // the roster switch waits for a portrait
  await gotoHydrated(page, '/account/profile')
  await expect(page.getByText(/Member № \d{4}/)).toBeVisible()
  const roster = page.getByLabel(/Show me on the roster/)
  await expect(roster).toBeDisabled()
  await expect(page.getByText('Add a portrait first.')).toBeVisible()

  await page.locator('#portrait').setInputFiles(path.join(FIXTURES, 'entry-1.jpg'))
  await expect(page.getByText('Portrait saved.')).toBeVisible({ timeout: 20_000 })
  await expect(roster).toBeEnabled()

  await page.getByLabel(/^Based in/).fill('Pretoria')
  await page.getByLabel(/^Bio/).fill('Streets first.\n\nThen the people on them.')
  await page.getByLabel(/^Instagram/).fill('@profile.member')
  await page.getByLabel(/^Website/).fill('https://example.org/work')
  await roster.check()
  await page.getByRole('button', { name: /Save/ }).click()
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
  await expect(page.getByLabel(/^Instagram/)).toHaveValue('https://www.instagram.com/profile.member/')
  await expect(page.getByRole('link', { name: /Your public page/ })).toBeVisible()

  // the roster and the public page
  await page.goto('/photographers')
  await expect(page.getByText('Profile Member')).toBeVisible()
  await page.getByRole('link', { name: /Profile Member/ }).first().click()
  await expect(page).toHaveURL(/\/photographers\/profile-member/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Profile Member')
  await expect(page.locator('.ph-head').getByText('Pretoria')).toBeVisible()
  await expect(page.getByText('Then the people on them.')).toBeVisible()
  await expect(page.getByRole('link', { name: /Instagram/ })).toHaveAttribute('href', 'https://www.instagram.com/profile.member/')
  await expect(page.getByRole('link', { name: /Website/ })).toHaveAttribute('href', 'https://example.org/work')
  await expect(page.locator('.ph-head img').first()).toHaveAttribute('src', /\/_ipx\//)

  // the API holds the rules on its own: a portrait must be the member's upload
  const origin = { Origin: new URL(page.url()).origin }
  const me = await page.request.get(`${API}/api/users/me?depth=1`, { headers: origin })
  const { user } = (await me.json()) as { user: { id: number; profile: { id: number } } }
  const theirs = await request.get(`${API}/api/media?limit=1&depth=0&sort=id`)
  const someoneElses = ((await theirs.json()) as { docs: { id: number; uploadedBy?: number | null }[] }).docs[0]
  expect(someoneElses, 'a public media file by someone else').toBeTruthy()
  expect(someoneElses.uploadedBy ?? null).not.toBe(user.id)
  const stolen = await page.request.patch(`${API}/api/people/${user.profile.id}`, {
    headers: origin,
    data: { portrait: someoneElses.id },
  })
  expect(stolen.status()).toBe(400)
})
