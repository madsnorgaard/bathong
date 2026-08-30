import type { Endpoint, PayloadRequest } from 'payload'
import { commitTransaction, initTransaction, killTransaction } from 'payload'
import crypto from 'crypto'
import { getContactEmail, sendSafe } from '../email/send'
import { accountDeleted, accountExists, emailChangeNotice, emailChangeVerify, passwordChanged } from '../email/templates'
import { FORMER_MEMBER, anonymisedEmail } from '../lib/anonymise'
import { passwordProblem } from '../lib/password'
import {
  checkPassword,
  expiredSessionCookie,
  keepOnlySession,
  listSessions,
  revokeAllSessions,
  revokeSession,
  type PasswordCheck,
} from '../lib/sessions'
import { siteUrl } from '../lib/siteUrl'
import { bad, isEmail, ok, readJson, str } from './respond'

/**
 * The security page's doors. Every change to the account itself asks for
 * the current password first (with sign-in's lockout); an email change
 * waits for the new address to confirm and dies with a password change;
 * sessions are listed and revoked by id; closing the account deletes the
 * person and keeps the work credited. POST /api/account/* is rate-limited
 * by Traefik alongside login.
 */

const EMAIL_CHANGE_TTL_MS = 60 * 60 * 1000

type Me = { id: number; email: string; name: string; roles?: string[] | null; _sid?: string }
const me = (req: PayloadRequest): Me | null => (req.user ? (req.user as unknown as Me) : null)

/** The password answer as a response, or null when it was right. */
const refused = (check: PasswordCheck) => {
  if (check === 'ok') return null
  if (check === 'locked') return bad('Too many attempts. This account is locked for ten minutes.', 400)
  return bad('That is not your current password.', 400)
}

/** Nothing pending: the fields a change-email request fills. */
export const NO_PENDING_EMAIL = { pendingEmail: null, pendingEmailToken: null, pendingEmailExpires: null }

export const accountChangePassword: Endpoint = {
  path: '/account/change-password',
  method: 'post',
  handler: async (req) => {
    const user = me(req)
    if (!user) return bad('Sign in first.', 401)
    const body = await readJson(req)
    const current = typeof body?.current === 'string' ? body.current : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const problem = passwordProblem(password, user.email)
    if (problem) return bad(problem)
    const no = refused(current ? await checkPassword(req.payload, req, user.id, current) : 'wrong')
    if (no) return no

    // A pending email change dies with the password: the person changing
    // it may be the one the change was meant to lock out.
    await req.payload.update({
      collection: 'users',
      id: user.id,
      data: { password, ...NO_PENDING_EMAIL },
      overrideAccess: true,
      req,
      context: { passwordChange: true },
    })
    await keepOnlySession(req.payload, req, user.id, user._sid)
    sendSafe(req, { to: user.email, ...passwordChanged(user.name, await getContactEmail(req)) })
    req.payload.logger.info({ userId: user.id }, 'security: password changed')
    return ok()
  },
}

export const accountChangeEmail: Endpoint = {
  path: '/account/change-email',
  method: 'post',
  handler: async (req) => {
    const user = me(req)
    if (!user) return bad('Sign in first.', 401)
    const body = await readJson(req)
    const password = typeof body?.password === 'string' ? body.password : ''
    const email = str(body?.email, 254).toLowerCase()
    if (!isEmail(email)) return bad('That does not look like an email address.')
    if (email === user.email.toLowerCase()) return bad('That is already your address.')
    const no = refused(password ? await checkPassword(req.payload, req, user.id, password) : 'wrong')
    if (no) return no

    const { payload } = req
    // Both branches write the same pending state, so nothing the asker can
    // read says whether the address has an account. A taken address gets a
    // note instead of the confirmation link; its token is never sent and
    // confirm-email refuses a taken address anyway.
    const token = crypto.randomBytes(20).toString('hex')
    await payload.update({
      collection: 'users',
      id: user.id,
      data: {
        pendingEmail: email,
        pendingEmailToken: token,
        pendingEmailExpires: new Date(Date.now() + EMAIL_CHANGE_TTL_MS).toISOString(),
      },
      overrideAccess: true,
      req,
    })
    const taken = await payload.count({ collection: 'users', where: { email: { equals: email } }, overrideAccess: true, req })
    const contact = await getContactEmail(req)
    if (taken.totalDocs > 0) {
      sendSafe(req, { to: email, ...accountExists(`${siteUrl()}/account/forgot`) })
    } else {
      const link = `${siteUrl()}/account/verify?kind=email&token=${encodeURIComponent(token)}`
      sendSafe(req, { to: email, ...emailChangeVerify(user.name, link) })
    }
    sendSafe(req, { to: user.email, ...emailChangeNotice(user.name, email, contact) })
    payload.logger.info({ userId: user.id }, 'security: email change requested')
    return ok({ pendingEmail: email })
  },
}

export const accountCancelEmailChange: Endpoint = {
  path: '/account/cancel-email-change',
  method: 'post',
  handler: async (req) => {
    const user = me(req)
    if (!user) return bad('Sign in first.', 401)
    await req.payload.update({ collection: 'users', id: user.id, data: NO_PENDING_EMAIL, overrideAccess: true, req })
    return ok()
  },
}

export const accountConfirmEmail: Endpoint = {
  path: '/account/confirm-email',
  method: 'post',
  handler: async (req) => {
    const body = await readJson(req)
    const token = str(body?.token, 80)
    if (!token) return bad('That link is invalid or already used.')
    const { payload } = req
    const { docs } = await payload.find({
      collection: 'users',
      where: { pendingEmailToken: { equals: token } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })
    const user = docs[0]
    if (!user || !user.pendingEmail) return bad('That link is invalid or already used.')
    if (!user.pendingEmailExpires || new Date(user.pendingEmailExpires).getTime() < Date.now()) {
      return bad('That link has expired. Ask for the change again from your security page.', 403)
    }
    const takenNow = () => bad('That address has an account now. Ask for the change again with another.')
    const taken = await payload.count({
      collection: 'users',
      where: { email: { equals: user.pendingEmail } },
      overrideAccess: true,
      req,
    })
    if (taken.totalDocs > 0) return takenNow()

    try {
      await payload.update({
        collection: 'users',
        id: user.id,
        data: { email: user.pendingEmail, ...NO_PENDING_EMAIL },
        overrideAccess: true,
        req,
      })
    } catch (err) {
      // the unique email: an account made between the check and the write
      payload.logger.info({ err, userId: user.id }, 'security: email change lost the race')
      return takenNow()
    }
    // The old address's sessions do not carry over.
    await revokeAllSessions(payload, req, user.id)
    payload.logger.info({ userId: user.id }, 'security: email changed')
    return ok()
  },
}

export const accountSessions: Endpoint = {
  path: '/account/sessions',
  method: 'get',
  handler: async (req) => {
    const user = me(req)
    if (!user) return bad('Sign in first.', 401)
    const sessions = await listSessions(req.payload, req, user.id)
    return ok({
      current: user._sid ?? null,
      sessions: sessions.map((s) => ({ id: s.id, createdAt: s.createdAt, expiresAt: s.expiresAt })),
    })
  },
}

export const accountRevokeSession: Endpoint = {
  path: '/account/sessions/revoke',
  method: 'post',
  handler: async (req) => {
    const user = me(req)
    if (!user) return bad('Sign in first.', 401)
    const body = await readJson(req)
    const id = str(body?.id, 64)
    if (!id) return bad('Which device?')
    await revokeSession(req.payload, req, user.id, id)
    return ok()
  },
}

/** A bulk operation that failed on any row fails the whole closing. */
const strict = (what: string, res: { errors?: unknown[] }) => {
  if (res.errors?.length) throw new Error(`${what}: ${JSON.stringify(res.errors).slice(0, 500)}`)
}

export const accountDelete: Endpoint = {
  path: '/account/delete',
  method: 'post',
  handler: async (req) => {
    const user = me(req)
    if (!user) return bad('Sign in first.', 401)
    const roles = user.roles ?? []
    if (roles.includes('admin') || roles.includes('editor')) return bad('Editors are removed by an admin.', 403)
    const body = await readJson(req)
    const password = typeof body?.password === 'string' ? body.password : ''
    const no = refused(password ? await checkPassword(req.payload, req, user.id, password) : 'wrong')
    if (no) return no

    const { payload } = req
    const anon = anonymisedEmail(user.id)
    const closing = { overrideAccess: true as const, req, context: { closingAccount: true, skipEmails: true, syncingOwner: true } }
    const shouldCommit = await initTransaction(req)
    try {
      // RSVPs keep their place on the walk under no name.
      strict(
        'rsvps',
        await payload.update({
          collection: 'rsvps',
          where: { or: [{ user: { equals: user.id } }, { email: { equals: user.email } }] },
          data: { name: FORMER_MEMBER, email: anon, user: null, note: null },
          ...closing,
        }),
      )
      // Entries still under judging are withdrawn with their files;
      // published entries keep the credit they were made under, not the account.
      strict(
        'submissions',
        await payload.delete({
          collection: 'submissions',
          where: { and: [{ submitter: { equals: user.id } }, { status: { not_equals: 'published' } }] },
          ...closing,
        }),
      )
      strict(
        'submissions',
        await payload.update({
          collection: 'submissions',
          where: { submitter: { equals: user.id } },
          data: { submitter: null, submitterEmail: anon },
          ...closing,
        }),
      )
      strict(
        'media',
        await payload.delete({
          collection: 'media',
          where: { and: [{ uploadedBy: { equals: user.id } }, { visibility: { equals: 'restricted' } }] },
          ...closing,
        }),
      )
      // The public page stays for the credits, off the roster, owned by nobody.
      strict(
        'people',
        await payload.update({
          collection: 'people',
          where: { owner: { equals: user.id } },
          data: { owner: null, onRoster: false, contactEmail: null, showContact: false },
          ...closing,
        }),
      )
      const open = await payload.find({
        collection: 'orders',
        where: { and: [{ user: { equals: user.id } }, { status: { equals: 'pending' } }] },
        depth: 0,
        limit: 20,
        overrideAccess: true,
        req,
      })
      for (const order of open.docs) {
        await payload.update({
          collection: 'orders',
          id: order.id,
          data: {
            status: 'cancelled',
            note: [order.note, 'Account closed by the member.'].filter(Boolean).join('\n'),
          },
          ...closing,
        })
      }
      await payload.delete({ collection: 'users', id: user.id, overrideAccess: true, req })
      if (shouldCommit) await commitTransaction(req)
    } catch (err) {
      await killTransaction(req)
      payload.logger.error({ err, userId: user.id }, 'security: account deletion failed')
      return bad('Could not close the account. Nothing was changed; write to us.', 500)
    }

    sendSafe(req, { to: user.email, ...accountDeleted(user.name) })
    payload.logger.info({ userId: user.id }, 'security: account deleted')
    return Response.json({ ok: true }, { status: 200, headers: { 'Set-Cookie': expiredSessionCookie(payload) } })
  },
}

export const accountSecurity: Endpoint[] = [
  accountChangePassword,
  accountChangeEmail,
  accountCancelEmailChange,
  accountConfirmEmail,
  accountSessions,
  accountRevokeSession,
  accountDelete,
]
