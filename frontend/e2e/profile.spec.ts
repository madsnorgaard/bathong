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
  await page.getByLabel(/^Contact email/).fill('profile.member@example.org')
  await roster.check()
  await page.getByRole('button', { name: /Save/ }).click()
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible()
  await expect(page.getByLabel(/^Instagram/)).toHaveValue('https://www.instagram.com/profile.member/')
  await expect(page.getByRole('link', { name: /Your public page/ })).toBeVisible()

  // the form reads back what was saved, the hidden contact address included
  await gotoHydrated(page, '/account/profile')
  await expect(page.getByLabel(/^Based in/)).toHaveValue('Pretoria')
  await expect(page.getByLabel(/^Bio/)).toHaveValue('Streets first.\n\nThen the people on them.')
  await expect(page.getByLabel(/^Contact email/)).toHaveValue('profile.member@example.org')
  await expect(page.getByLabel(/Show me on the roster/)).toBeChecked()

  // a replaced portrait does not linger as a public orphan
  const before = await page.request.get(`${API}/api/users/me?depth=1`, { headers: { Origin: new URL(page.url()).origin } })
  const firstPortrait = ((await before.json()) as { user: { profile: { portrait: number } } }).user.profile.portrait
  expect(typeof firstPortrait).toBe('number')
  await page.locator('#portrait').setInputFiles(path.join(FIXTURES, 'entry-2.jpg'))
  await expect(page.getByText('Portrait saved.')).toBeVisible({ timeout: 20_000 })
  await expect.poll(async () => (await request.get(`${API}/api/media/${firstPortrait}`)).status()).toBe(404)

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
  // contact stays private until the member says otherwise
  const contact = page.getByRole('link', { name: /Contact/ })
  if (await contact.count()) expect(await contact.getAttribute('href')).not.toMatch(/profile\.member@/)
  const publicDoc = await request.get(`${API}/api/people?where[slug][equals]=profile-member&depth=0`)
  expect(JSON.stringify(await publicDoc.json())).not.toContain('profile.member@example.org')

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

  // the editorial fields are not theirs; another profile is not theirs at all
  const own = await page.request.patch(`${API}/api/people/${user.profile.id}`, {
    headers: origin,
    data: { name: 'Someone Else', slug: 'someone-else', memberNumber: 1, roleTitle: 'Founder' },
  })
  expect(own.status()).toBe(200)
  const after = (await own.json()).doc as { name: string; slug: string; roleTitle?: string | null }
  expect(after.name).toBe('Profile Member')
  expect(after.slug).toBe('profile-member')
  expect(after.roleTitle ?? null).toBeNull()
  const founders = await request.get(`${API}/api/people?where[foundingCircle][equals]=true&limit=1&depth=0`)
  const founder = ((await founders.json()) as { docs: { id: number }[] }).docs[0]
  const theirsToo = await page.request.patch(`${API}/api/people/${founder.id}`, { headers: origin, data: { basedIn: 'Nowhere' } })
  expect([403, 404]).toContain(theirsToo.status())

  // the bio is a few lines, not an essay
  const long = await page.request.patch(`${API}/api/people/${user.profile.id}`, {
    headers: origin,
    data: { bio: { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'x'.repeat(2001) }] }] } } },
  })
  expect(long.status()).toBe(400)
})
