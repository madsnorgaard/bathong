import { request } from '@playwright/test'

/**
 * One admin login for the whole run. Payload appends each login to the
 * user's sessions array, so two spec files logging in as the same admin at
 * the same moment lose one of the sessions and that token 403s. The token
 * lands in process.env, which Playwright hands to every worker; specs fall
 * back to their own login when the backend was not reachable here.
 */
export default async function globalSetup() {
  const admin = process.env.PAYLOAD_URL ?? 'http://localhost:3001'
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@bathong.local'
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'bathong-admin-dev'
  const ctx = await request.newContext()
  try {
    const res = await ctx.post(`${admin}/api/users/login`, { data: { email, password } })
    if (res.ok()) process.env.E2E_ADMIN_TOKEN = (await res.json()).token as string
  } catch {
    // no backend: the admin specs will report it themselves
  } finally {
    await ctx.dispose()
  }
}
