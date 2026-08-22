/**
 * Archive query helpers. The /archive page keeps ALL its state in the URL
 * (shareable, SSR-rendered); these build the next query for a filter link.
 */

export type ArchiveQuery = Record<string, string | undefined>

const FILTER_KEYS = ['q', 'photographer', 'year', 'tag'] as const

/** A frame as served by GET /api/archive. */
export interface ArchiveDoc {
  id: number
  caption: string | null
  location: string | null
  year: number | null
  tags: string[]
  thumb: string | null
  full: string | null
  width: number | null
  height: number | null
  alt: string | null
  photographerSlug: string | null
  photographerName: string | null
  credit: string | null
}

export interface ArchiveResponse {
  docs: ArchiveDoc[]
  page: number
  totalPages: number
  totalDocs: number
  facets: {
    photographers: { slug: string; name: string; count: number }[]
    years: { year: number; count: number }[]
    tags: { tag: string; count: number }[]
  }
}

/** Keep only the known filter keys, as plain strings. */
export function archiveFilters(raw: Record<string, unknown>): ArchiveQuery {
  const out: ArchiveQuery = {}
  for (const key of FILTER_KEYS) {
    const v = raw[key]
    const s = Array.isArray(v) ? v[0] : v
    if (typeof s === 'string' && s.trim()) out[key] = s.trim()
  }
  return out
}

/**
 * Merge a patch into the current filters: a string sets, undefined/'' clears,
 * and `page` is always dropped because any filter change restarts at page 1.
 */
export function archiveQuery(base: Record<string, unknown>, patch: ArchiveQuery): ArchiveQuery {
  const merged = { ...archiveFilters(base), ...patch }
  return Object.fromEntries(
    Object.entries(merged).filter(([, value]) => value !== undefined && value !== ''),
  ) as ArchiveQuery
}

/** Same filters, a different page (page 1 is omitted so the URL stays clean). */
export function archivePage(base: Record<string, unknown>, page: number): ArchiveQuery {
  const next = archiveFilters(base)
  if (page > 1) next.page = String(page)
  return next
}

/** The query string sent to the API for a given route query. */
export function archiveApiPath(raw: Record<string, unknown>): string {
  const params = new URLSearchParams(archiveFilters(raw))
  const page = Array.isArray(raw.page) ? raw.page[0] : raw.page
  if (typeof page === 'string' && /^\d+$/.test(page) && Number(page) > 1) params.set('page', page)
  const qs = params.toString()
  return qs ? `/api/archive?${qs}` : '/api/archive'
}
