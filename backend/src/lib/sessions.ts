import crypto from 'crypto'
import type { Payload, PayloadRequest } from 'payload'
import { generateExpiredPayloadCookie } from 'payload/shared'

/**
 * The few things the security page needs from Payload's auth internals,
 * kept in one file: Payload 3.84 does not export its local password check
 * or its session write, so both are mirrored here (the hashing is
 * pbkdf2/sha256, 25000 rounds, 512 bytes, as in
 * payload/dist/auth/strategies/local/authenticate.js). A Payload upgrade
 * that changes either touches this file only.
 */

export interface Session {
  id: string
  createdAt: string | Date
  expiresAt: string | Date
}

type RawUser = { id: number; hash?: string | null; salt?: string | null; sessions?: Session[] | null; updatedAt?: unknown }

async function rawUser(payload: Payload, req: PayloadRequest, id: number): Promise<RawUser | null> {
  const doc = await payload.db.findOne({ collection: 'users', where: { id: { equals: id } }, req })
  return (doc as RawUser | null) ?? null
}

/** True when the password matches the stored hash. Never throws; constant-time compare. */
export async function checkPassword(payload: Payload, req: PayloadRequest, id: number, password: string): Promise<boolean> {
  const user = await rawUser(payload, req, id)
  if (!user || typeof user.hash !== 'string' || typeof user.salt !== 'string') return false
  const { hash, salt } = user
  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, 25000, 512, 'sha256', (err, derived) => {
      if (err) return resolve(false)
      const stored = Buffer.from(hash, 'hex')
      resolve(derived.length === stored.length && crypto.timingSafeEqual(derived, stored))
    })
  })
}

/** The live sessions on an account, expired ones dropped. */
export async function listSessions(payload: Payload, req: PayloadRequest, id: number): Promise<Session[]> {
  const user = await rawUser(payload, req, id)
  const now = Date.now()
  return (user?.sessions ?? []).filter((s) => new Date(s.expiresAt).getTime() > now)
}

async function writeSessions(payload: Payload, req: PayloadRequest, user: RawUser, sessions: Session[]) {
  // as Payload's own logout does: updatedAt untouched when only sessions move
  await payload.db.updateOne({
    id: user.id,
    collection: 'users',
    data: { ...user, sessions, updatedAt: null },
    req,
    returning: false,
  })
}

/** Keep one session (the device making the change); every other device is signed out. */
export async function keepOnlySession(payload: Payload, req: PayloadRequest, id: number, sid: string | undefined) {
  const user = await rawUser(payload, req, id)
  if (!user) return
  await writeSessions(payload, req, user, (user.sessions ?? []).filter((s) => s.id === sid))
}

/** Sign one device out by its session id. */
export async function revokeSession(payload: Payload, req: PayloadRequest, id: number, sid: string) {
  const user = await rawUser(payload, req, id)
  if (!user) return
  await writeSessions(payload, req, user, (user.sessions ?? []).filter((s) => s.id !== sid))
}

/** Sign every device out. */
export async function revokeAllSessions(payload: Payload, req: PayloadRequest, id: number) {
  const user = await rawUser(payload, req, id)
  if (!user) return
  await writeSessions(payload, req, user, [])
}

/** The Set-Cookie value that clears the session cookie in the browser. */
export function expiredSessionCookie(payload: Payload): string {
  return generateExpiredPayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix ?? 'payload',
  }) as string
}
