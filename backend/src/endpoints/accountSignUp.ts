import type { Endpoint, PayloadRequest } from 'payload'
import crypto from 'crypto'
import { passwordProblem } from '../lib/password'
import { siteUrl } from '../lib/siteUrl'
import { sendSafe } from '../email/send'
import { accountExists, verifyEmail } from '../email/templates'
import { bad, isEmail, ok, readJson, str } from './respond'

/**
 * The one door for making an account (anyone can join). users.create stays
 * admin-only; this endpoint takes exactly name, email, password and the
 * newsletter preference, behind a honeypot. It answers 200 whether or not
 * the address already has an account, so nothing about who is a member
 * leaks: an existing address gets an email instead of an error.
 * Traefik rate-limits /api/account/* alongside login.
 */

const verifyLink = (token: string) =>
  `${siteUrl()}/account/verify?token=${encodeURIComponent(token)}`

/** A fresh verification token on an existing, unverified account. */
export async function refreshVerificationToken(req: PayloadRequest, id: number): Promise<string> {
  const token = crypto.randomBytes(20).toString('hex')
  await req.payload.update({
    collection: 'users',
    id,
    data: { _verificationToken: token } as never,
    overrideAccess: true,
    req,
  })
  return token
}

export const accountSignUp: Endpoint = {
  path: '/account/sign-up',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const body = await readJson(req)
    if (!body) return bad('Could not read the request.')
    if (str(body.website)) return bad('Could not process this request.')

    const name = str(body.name, 80)
    const email = str(body.email, 254).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const newsletter = body.newsletter === true

    if (name.length < 2) return bad('Tell us your name.')
    if (!isEmail(email)) return bad('That does not look like an email address.')
    const problem = passwordProblem(password, email)
    if (problem) return bad(problem)

    const { payload } = req
    const existing = await payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })
    const found = existing.docs[0] as (typeof existing.docs)[number] & { _verified?: boolean }

    if (found) {
      if (found._verified === false) {
        const token = await refreshVerificationToken(req, found.id)
        sendSafe(req, { to: email, ...verifyEmail(found.name, verifyLink(token)) })
      } else {
        sendSafe(req, { to: email, ...accountExists(`${siteUrl()}/account/forgot`) })
      }
      payload.logger.info({ userId: found.id }, 'account: sign-up for an existing address')
      return ok()
    }

    const created = await payload.create({
      collection: 'users',
      data: { name, email, password, roles: ['member'], newsletter },
      overrideAccess: true,
      disableVerificationEmail: true,
      req,
    })
    const withToken = (await payload.findByID({
      collection: 'users',
      id: created.id,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })) as { _verificationToken?: string | null }
    const token = withToken._verificationToken ?? (await refreshVerificationToken(req, created.id))
    sendSafe(req, { to: email, ...verifyEmail(name, verifyLink(token)) })
    payload.logger.info({ userId: created.id }, 'account: sign-up')
    return ok()
  },
}

export const accountResendVerification: Endpoint = {
  path: '/account/resend-verification',
  method: 'post',
  handler: async (req: PayloadRequest) => {
    const body = await readJson(req)
    if (!body) return bad('Could not read the request.')
    if (str(body.website)) return bad('Could not process this request.')
    const email = str(body.email, 254).toLowerCase()
    if (!isEmail(email)) return bad('That does not look like an email address.')

    const { docs } = await req.payload.find({
      collection: 'users',
      where: { email: { equals: email } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
      req,
    })
    const found = docs[0] as (typeof docs)[number] & { _verified?: boolean }
    if (found && found._verified === false) {
      const token = await refreshVerificationToken(req, found.id)
      sendSafe(req, { to: email, ...verifyEmail(found.name, verifyLink(token)) })
    }
    // Same answer whether or not the address exists or is already verified.
    return ok()
  },
}
