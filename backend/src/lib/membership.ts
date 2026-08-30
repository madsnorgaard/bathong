import crypto from 'crypto'

/**
 * Membership arithmetic, pure and unit-tested: when a plan runs to, what
 * an order costs, and the EFT reference a member types at the bank.
 */
export type Plan = 'monthly' | 'annual'

export const PLANS: Plan[] = ['monthly', 'annual']

/** Days before expiry in which a member may renew. */
export const RENEWAL_WINDOW_DAYS = 30

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

/**
 * One month or one year on, keeping the day of the month where the target
 * month has it (31 Jan + 1 month = 28 Feb; 29 Feb + 1 year = 28 Feb).
 */
export function nextExpiry(base: Date, plan: Plan): Date {
  const year = base.getUTCFullYear()
  const month = base.getUTCMonth()
  const day = base.getUTCDate()
  const targetYear = plan === 'annual' ? year + 1 : month === 11 ? year + 1 : year
  const targetMonth = plan === 'annual' ? month : (month + 1) % 12
  const clampedDay = Math.min(day, daysInMonth(targetYear, targetMonth))
  const out = new Date(base)
  out.setUTCFullYear(targetYear, targetMonth, clampedDay)
  return out
}

/**
 * Where the new period starts: on the current expiry when the membership is
 * still running (a renewal never shortens what was paid for), else on the
 * day the payment showed.
 */
export function activationBase(
  user: { membershipStatus?: string | null; membershipExpires?: string | null },
  paidAt: Date,
): Date {
  if (user.membershipStatus === 'active' && user.membershipExpires) {
    const expires = new Date(user.membershipExpires)
    if (expires.getTime() > paidAt.getTime()) return expires
  }
  return paidAt
}

/** Unambiguous at a bank keypad: no 0/O, 1/I. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function makeReference(prefix: string, randomInt: (max: number) => number = (max) => crypto.randomInt(max)): string {
  const clean = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'BTG'
  let tail = ''
  for (let i = 0; i < 6; i += 1) tail += ALPHABET[randomInt(ALPHABET.length)]
  return `${clean}-${tail}`
}

export interface Prices {
  joiningFee?: number | null
  priceMonthly?: number | null
  priceAnnual?: number | null
}

/** The order total, or null while the collective has not set a price. */
export function orderAmount(
  prices: Prices,
  hasJoined: boolean,
  plan: Plan,
): { amount: number; joiningFee: number } | null {
  const planPrice = plan === 'annual' ? prices.priceAnnual : prices.priceMonthly
  if (typeof planPrice !== 'number') return null
  const fee = hasJoined ? 0 : typeof prices.joiningFee === 'number' ? prices.joiningFee : 0
  return { amount: planPrice + fee, joiningFee: fee }
}

export const daysUntil = (iso: string, now: Date = new Date()): number =>
  Math.ceil((new Date(iso).getTime() - now.getTime()) / 86_400_000)
