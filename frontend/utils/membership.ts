/**
 * Membership words for the desk: the status once the date is taken into
 * account, the № label, the plan word. Never invents a value.
 */
export type Plan = 'monthly' | 'annual'

export const RENEWAL_WINDOW_DAYS = 30

export function effectiveStatus(
  user: { membershipStatus?: string | null; membershipExpires?: string | null } | null | undefined,
  now: number = Date.now(),
): 'active' | 'lapsed' | 'none' {
  if (!user) return 'none'
  if (user.membershipStatus === 'active') {
    if (user.membershipExpires && new Date(user.membershipExpires).getTime() < now) return 'lapsed'
    return 'active'
  }
  if (user.membershipStatus === 'lapsed') return 'lapsed'
  return 'none'
}

export const memberNumberLabel = (n: number): string => `№ ${String(n).padStart(4, '0')}`

export const planLabel = (plan?: string | null): string =>
  plan === 'annual' ? 'Annual' : plan === 'monthly' ? 'Monthly' : 'TBC'

/** "since August 2026" from the first activation date. */
export function sinceLabel(iso?: string | null): string | null {
  if (!iso) return null
  return new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' }).format(
    new Date(iso),
  )
}

/** Renewal opens inside the last 30 days of a running membership. */
export function canRenew(user: { membershipStatus?: string | null; membershipExpires?: string | null } | null | undefined, now = Date.now()): boolean {
  const status = effectiveStatus(user, now)
  if (status !== 'active') return true
  if (!user?.membershipExpires) return true
  const left = (new Date(user.membershipExpires).getTime() - now) / 86_400_000
  return left <= RENEWAL_WINDOW_DAYS
}
