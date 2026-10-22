import type { Endpoint, PayloadRequest } from 'payload'
import { runMembershipNotices } from '../jobs/membershipNotices'
import { bad, ok, readJson, str } from './respond'

/**
 * Test-only doors, registered solely when E2E_HOOKS=true (set in ci.yml and
 * on a dev backend; never in the production compose file). Admin-only even
 * then. They read the tokens that otherwise only travel by email, so the
 * suite can walk sign-up and email-change end to end without SMTP.
 */
const verificationToken: Endpoint = {
  path: '/e2e/verification-token',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const roles = (req.user?.roles as string[] | undefined) ?? []
    if (!roles.includes('admin')) return bad('Admins only.', 403)
    const email = str(new URL(req.url ?? 'http://localhost').searchParams.get('email'), 254).toLowerCase()
    if (!email) return bad('email is required.')
    const { docs } = await req.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })
    const user = docs[0] as
      | ((typeof docs)[number] & { _verificationToken?: string | null; pendingEmailToken?: string | null })
      | undefined
    if (!user) return bad('No such user.', 404)
    return ok({
      token: user._verificationToken ?? null,
      pendingEmailToken: user.pendingEmailToken ?? null,
    })
  },
}

/** Runs the membership notices job as if today were `now` (#83). */
const membershipNotices: Endpoint = {
  path: '/e2e/membership-notices',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const roles = (req.user?.roles as string[] | undefined) ?? []
    if (!roles.includes('admin')) return bad('Admins only.', 403)
    const body = await readJson(req)
    const now = typeof body?.now === 'string' ? new Date(body.now) : new Date()
    if (Number.isNaN(now.getTime())) return bad('now must be an ISO date.')
    const result = await runMembershipNotices(req.payload, req, now)
    return ok({ ...result })
  },
}

export const e2eHooks: Endpoint[] = process.env.E2E_HOOKS === 'true' ? [verificationToken, membershipNotices] : []
