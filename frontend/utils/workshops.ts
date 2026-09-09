/**
 * The workshop mirror of utils/walks.ts: a workshop is current until it
 * wraps (endTime), not until it starts. Past-ness reuses isPastWalk, which
 * is structural over { date, endTime }.
 */
import { walkNumber } from './format'

/** Upcoming or in progress: starts later, or has not wrapped yet. */
export function nextWorkshopsQuery(now: string, limit: number): string {
  const t = encodeURIComponent(now)
  return `/api/workshops?where[or][0][date][greater_than_equal]=${t}&where[or][1][endTime][greater_than_equal]=${t}&sort=date&limit=${limit}&depth=0`
}

/** Started, and either has no wrap time or has wrapped. Newest first. */
export function pastWorkshopsQuery(now: string, limit: number): string {
  const t = encodeURIComponent(now)
  return `/api/workshops?where[and][0][date][less_than]=${t}&where[and][1][or][0][endTime][exists]=false&where[and][1][or][1][endTime][less_than]=${t}&sort=-date&limit=${limit}&depth=0`
}

/** "№ 001" from the workshop's virtual number; one with no number is the first. */
export function workshopNo(workshop: { number?: number | null }): string {
  return walkNumber(workshop.number ?? 1)
}

export function workshopPath(workshop: { slug?: string | null }): string {
  return workshop.slug ? `/workshops/${encodeURIComponent(workshop.slug)}` : '/workshops'
}
