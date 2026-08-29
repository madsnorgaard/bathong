import type { Endpoint, PayloadRequest } from 'payload'
import { bad, ok, str } from './respond'

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

export const e2eHooks: Endpoint[] = process.env.E2E_HOOKS === 'true' ? [verificationToken] : []
