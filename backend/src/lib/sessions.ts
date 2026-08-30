import crypto from 'crypto'
import type { Payload, PayloadRequest } from 'payload'
import { generateExpiredPayloadCookie } from 'payload/shared'

/**
 * The few things the security page needs from Payload's auth internals,
 * kept in one file: Payload 3.84 does not export its local password check
 * or its session write, so both are mirrored here (the hashing is
 * pbkdf2/sha256, 25000 rounds, 512 bytes, as in
 * payload/dist/auth/strategies/local/authenticate.js; the lockout counts
 * as payload/dist/auth/strategies/local/incrementLoginAttempts.js does).
 * A Payload upgrade that changes any of it touches this file only.
 */

export interface Session {
  id: string
  createdAt: string | Date
  expiresAt: string | Date
}

type RawUser = {
  id: number
  hash?: string | null
  salt?: string | null
  sessions?: Session[] | null
  loginAttempts?: number | null
  lockUntil?: string | Date | null
  updatedAt?: unknown
}

async function rawUser(payload: Payload, req: PayloadRequest, id: number): Promise<RawUser | null> {
  const doc = await payload.db.findOne({ collection: 'users', where: { id: { equals: id } }, req })
  return (doc as RawUser | null) ?? null
}

/** Write a few columns without touching updatedAt (as Payload's own auth writes do). */
async function patchRaw(payload: Payload, req: PayloadRequest, user: RawUser, patch: Partial<RawUser>) {
  await payload.db.updateOne({
    id: user.id,
    collection: 'users',
    data: { ...user, ...patch, updatedAt: null },
    req,
    returning: false,
  })
}

const hashMatches = (password: string, salt: string, hash: string) =>
  new Promise<boolean>((resolve) => {
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, derived) => {
      if (err) return resolve(false)
      const stored = Buffer.from(hash, 'hex')
      resolve(derived.length === stored.length && crypto.timingSafeEqual(derived, stored))
    })
  })

export type PasswordCheck = 'ok' | 'wrong' | 'locked'

/**
 * Check a password against the account, with the same lockout as sign-in:
 * a locked account is refused without a comparison, a wrong password
 * counts towards the lock, a right one clears the count.
 */
export async function checkPassword(payload: Payload, req: PayloadRequest, id: number, password: string): Promise<PasswordCheck> {
  const user = await rawUser(payload, req, id)
  if (!user || typeof user.hash !== 'string' || typeof user.salt !== 'string') return 'wrong'
  const now = Date.now()
  if (user.lockUntil && new Date(user.lockUntil).getTime() > now) return 'locked'

  if (await hashMatches(password, user.salt, user.hash)) {
    if (user.loginAttempts || user.lockUntil) await patchRaw(payload, req, user, { loginAttempts: 0, lockUntil: null })
    return 'ok'
  }
  const { maxLoginAttempts, lockTime } = payload.collections.users.config.auth
  const attempts = (user.loginAttempts ?? 0) + 1
  const locked = maxLoginAttempts > 0 && attempts >= maxLoginAttempts
  await patchRaw(payload, req, user, {
    loginAttempts: attempts,
    lockUntil: locked ? new Date(now + lockTime).toISOString() : (user.lockUntil ?? null),
  })
  return locked ? 'locked' : 'wrong'
}

/** The live sessions on an account, expired ones dropped. */
export async function listSessions(payload: Payload, req: PayloadRequest, id: number): Promise<Session[]> {
  const user = await rawUser(payload, req, id)
  const now = Date.now()
  return (user?.sessions ?? []).filter((s) => new Date(s.expiresAt).getTime() > now)
}

/** Keep one session (the device making the change); every other device is signed out. */
export async function keepOnlySession(payload: Payload, req: PayloadRequest, id: number, sid: string | undefined) {
  if (!sid) return
  const user = await rawUser(payload, req, id)
  if (!user) return
  await patchRaw(payload, req, user, { sessions: (user.sessions ?? []).filter((s) => s.id === sid) })
}

/** Sign one device out by its session id. */
export async function revokeSession(payload: Payload, req: PayloadRequest, id: number, sid: string) {
  const user = await rawUser(payload, req, id)
  if (!user) return
  await patchRaw(payload, req, user, { sessions: (user.sessions ?? []).filter((s) => s.id !== sid) })
}

/** Sign every device out. */
export async function revokeAllSessions(payload: Payload, req: PayloadRequest, id: number) {
  const user = await rawUser(payload, req, id)
  if (!user) return
  await patchRaw(payload, req, user, { sessions: [] })
}

/** The Set-Cookie value that clears the session cookie in the browser. */
export function expiredSessionCookie(payload: Payload): string {
  return generateExpiredPayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix ?? 'payload',
  }) as string
}
