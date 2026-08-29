/**
 * The one rule for a walk's place in time, shared by the pages and the
 * share-card routes: a walk is current until it wraps (endTime), not until it
 * starts. Query builders keep the two Payload predicates in one place.
 */
import { walkNumber } from './format'

export interface WalkTime {
  date?: string | null
  endTime?: string | null
}

export interface WalkRef extends WalkTime {
  slug?: string | null
  number?: number | null
}

/** Upcoming or in progress: starts later, or has not wrapped yet. */
export function nextWalksQuery(now: string, limit: number): string {
  const t = encodeURIComponent(now)
  return `/api/walks?where[or][0][date][greater_than_equal]=${t}&where[or][1][endTime][greater_than_equal]=${t}&sort=date&limit=${limit}&depth=0&joins[frames]=false`
}

/** Started, and either has no wrap time or has wrapped. Newest first. */
export function pastWalksQuery(now: string, limit: number): string {
  const t = encodeURIComponent(now)
  return `/api/walks?where[and][0][date][less_than]=${t}&where[and][1][or][0][endTime][exists]=false&where[and][1][or][1][endTime][less_than]=${t}&sort=-date&limit=${limit}&depth=0&joins[frames]=false`
}

/** True once the walk has wrapped (or started, when no wrap time is set). */
export function isPastWalk(walk: WalkTime, now: number = Date.now()): boolean {
  if (walk.endTime) return new Date(walk.endTime).getTime() < now
  if (walk.date) return new Date(walk.date).getTime() < now
  return false
}

/** "№ 001" from the walk's virtual number; a walk with no number is the first. */
export function walkNo(walk: { number?: number | null }): string {
  return walkNumber(walk.number ?? 1)
}

export function walkPath(walk: { slug?: string | null }): string {
  return walk.slug ? `/walks/${encodeURIComponent(walk.slug)}` : '/walks'
}
