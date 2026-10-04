/**
 * Exhibition helpers shared by /exhibitions, the photographer page and the
 * share-card routes: where an exhibition sits in time, how its dates read,
 * which photograph leads it, and the queries that fetch it.
 *
 * The dates decide where they can (an exhibition is on through its last day,
 * counted in SAST); the editor's status field covers what the dates cannot.
 * Nothing is invented: a missing date reads "Dates TBC".
 */
import { formatWalkDate } from './format'

const SAST = 'Africa/Johannesburg'
const COLLECTIVE = 'Bathong. Collective'

export type ExhibitionPhase = 'current' | 'upcoming' | 'past'

export interface ExhibitionTime {
  startDate?: string | null
  endDate?: string | null
  status?: ExhibitionPhase | null
}

/** The calendar day in SAST as YYYY-MM-DD, so days compare as strings. */
function sastDay(when: string | number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SAST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(when))
}

/**
 * Past once the last day has gone, upcoming until the first day, current in
 * between. When a date is missing the editor's status stands; with neither,
 * an exhibition that has opened is current and one with no opening day is
 * still to come.
 */
export function exhibitionPhase(exhibition: ExhibitionTime, now: number = Date.now()): ExhibitionPhase {
  const today = sastDay(now)
  const start = exhibition.startDate ? sastDay(exhibition.startDate) : null
  const end = exhibition.endDate ? sastDay(exhibition.endDate) : null
  if (end && end < today) return 'past'
  if (start && start > today) return 'upcoming'
  if (start && end) return 'current'
  if (exhibition.status) return exhibition.status
  return start ? 'current' : 'upcoming'
}

/** The phase as the pages say it. */
export function exhibitionPhaseLabel(phase: ExhibitionPhase): string {
  return phase === 'current' ? 'On now' : phase === 'upcoming' ? 'Coming up' : 'Past'
}

const time = (iso: string | null | undefined, fallback: number) =>
  iso ? new Date(iso).getTime() : fallback

/**
 * The order of the index: what is on now (closing soonest first), what is
 * coming (opening soonest first, undated last), then the record, newest
 * first.
 */
export function orderExhibitions<T extends ExhibitionTime>(
  docs: T[],
  now: number = Date.now(),
): { live: T[]; past: T[] } {
  const by = (phase: ExhibitionPhase) => docs.filter((d) => exhibitionPhase(d, now) === phase)
  const current = by('current').sort(
    (a, b) => time(a.endDate, Infinity) - time(b.endDate, Infinity),
  )
  const upcoming = by('upcoming').sort(
    (a, b) => time(a.startDate, Infinity) - time(b.startDate, Infinity),
  )
  const past = by('past').sort(
    (a, b) => time(b.endDate ?? b.startDate, -Infinity) - time(a.endDate ?? a.startDate, -Infinity),
  )
  return { live: [...current, ...upcoming], past }
}

/**
 * The dates as lines, for display type: the opening day, then "to" the
 * closing day. One day reads as one line; no dates read "Dates TBC".
 */
export function exhibitionDateLines(exhibition: ExhibitionTime): string[] {
  const { startDate, endDate } = exhibition
  if (startDate && endDate) {
    return sastDay(startDate) === sastDay(endDate)
      ? [formatWalkDate(startDate)]
      : [formatWalkDate(startDate), `to ${formatWalkDate(endDate)}`]
  }
  if (startDate) return [`From ${formatWalkDate(startDate)}`]
  if (endDate) return [`Until ${formatWalkDate(endDate)}`]
  return ['Dates TBC']
}

/** The same dates on one line, for captions and descriptions. */
export function exhibitionDates(exhibition: ExhibitionTime): string {
  return exhibitionDateLines(exhibition).join(' ')
}

export function exhibitionPath(exhibition: { slug?: string | null }): string {
  return exhibition.slug ? `/exhibitions/${encodeURIComponent(exhibition.slug)}` : '/exhibitions'
}

// ---- the photographs ---------------------------------------------------------

interface MediaRef {
  url?: string | null
  alt?: string | null
  credit?: string | null
}
interface PersonRef {
  id: number | string
  name?: string | null
  slug?: string | null
}
interface FrameRef<M> {
  id: number | string
  image?: M | number | null
  photographer?: PersonRef | number | null
  creditOverride?: string | null
}
interface ExhibitionWork<M, F> {
  heroImage?: M | number | null
  frames?: Array<F | number> | null
}

const hasPicture = <M extends MediaRef>(media: M | number | null | undefined): media is M =>
  Boolean(media) && typeof media === 'object' && Boolean((media as M).url)

/**
 * The frames on the wall that can be shown: populated, with a picture.
 * Restricted media arrives as a bare id for anonymous readers, and a frame
 * without a picture is not shown.
 */
export function exhibitionFrames<M extends MediaRef, F extends FrameRef<M>>(
  exhibition: ExhibitionWork<M, F>,
): Array<F & { image: M }> {
  return (exhibition.frames ?? []).filter(
    (f): f is F & { image: M } => Boolean(f) && typeof f === 'object' && hasPicture(f.image),
  )
}

/** A frame's credit by the frame's own rule: override, profile, collective. */
function creditOf(frame: FrameRef<unknown>): string {
  if (frame.creditOverride) return frame.creditOverride
  const p = frame.photographer
  return (p && typeof p === 'object' ? p.name : null) || COLLECTIVE
}

/**
 * The photograph that stands for an exhibition, on the index and on its
 * share card: the hero image, else the first frame on the wall. It never
 * travels without a credit: the file's own, the frame's, else the
 * collective. Null while the exhibition has no photograph to show.
 */
export function exhibitionLead<M extends MediaRef, F extends FrameRef<M>>(
  exhibition: ExhibitionWork<M, F>,
): { media: M; credit: string } | null {
  const hero = exhibition.heroImage
  if (hasPicture(hero)) return { media: hero, credit: hero.credit?.trim() || COLLECTIVE }
  const first = exhibitionFrames(exhibition)[0]
  return first ? { media: first.image, credit: creditOf(first) } : null
}

/** The photographers with a profile whose frames hang here, each named once, in hanging order. */
export function exhibitionPhotographers<M extends MediaRef, F extends FrameRef<M>>(
  exhibition: ExhibitionWork<M, F>,
): PersonRef[] {
  const seen = new Map<number | string, PersonRef>()
  for (const frame of exhibition.frames ?? []) {
    if (!frame || typeof frame !== 'object') continue
    const p = frame.photographer
    if (p && typeof p === 'object' && p.name && !seen.has(p.id)) seen.set(p.id, p)
  }
  return [...seen.values()]
}

/** How many frames on this wall are one photographer's. */
export function framesOnWall<M extends MediaRef, F extends FrameRef<M>>(
  exhibition: ExhibitionWork<M, F>,
  personId: number | string,
): number {
  return (exhibition.frames ?? []).filter((frame) => {
    if (!frame || typeof frame !== 'object') return false
    const p = frame.photographer
    return String(p && typeof p === 'object' ? p.id : p) === String(personId)
  }).length
}

// ---- queries -----------------------------------------------------------------

/**
 * What a populated relation carries. A frame populated whole brings its walk
 * (route geometry and joins) with it, an essay its whole sequence; a phone
 * on paid data pays for every byte of that in the page payload. `filename`
 * rides along because Payload computes a file's url from it.
 */
const POPULATE = {
  frames: ['image', 'photographer', 'creditOverride', 'caption', 'location', 'year'],
  people: ['name', 'slug'],
  media: ['filename', 'url', 'alt', 'credit', 'width', 'height'],
  essays: ['title', 'slug', 'deck', 'leadFrame'],
} as const

const fields = (param: string, key: string, names: readonly string[]) =>
  names.map((name) => `${param}[${key}][${name}]=true`)

const populate = (...collections: Array<keyof typeof POPULATE>) =>
  collections.flatMap((c) => fields('populate', c, POPULATE[c])).join('&')

/**
 * Every published exhibition, newest opening first, with only what a list
 * draws: the facts, the hero image and the frames (for the lead photograph
 * and the count). `trimMedia` is off for the share-card route, which wants
 * the og rendition of the lead photograph.
 */
export function exhibitionsQuery(limit: number, trimMedia = true): string {
  const select = ['title', 'slug', 'venue', 'startDate', 'endDate', 'status', 'heroImage', 'frames', 'updatedAt']
    .map((name) => `select[${name}]=true`)
    .join('&')
  const relations = trimMedia ? populate('frames', 'people', 'media') : populate('frames', 'people')
  return `/api/exhibitions?sort=-startDate&limit=${limit}&depth=2&${select}&${relations}`
}

/**
 * One exhibition by slug. Depth 3 so a related essay's lead frame arrives
 * with its picture (exhibition, essay, frame, media); the populate lists keep
 * that depth from dragging walks and sequences along.
 */
export function exhibitionQuery(slug: string): string {
  return `/api/exhibitions?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=3&${populate('frames', 'people', 'media', 'essays')}`
}

/** The same exhibition for its share card: frames credited, media whole (the og rendition). */
export function exhibitionCardQuery(slug: string): string {
  return `/api/exhibitions?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2&${populate('frames', 'people')}`
}

/**
 * The exhibitions that hang one photographer's frames. Depth 1: each frame
 * arrives with its photographer as an id, which is all the count needs.
 */
export function photographerExhibitionsQuery(personId: number | string, limit: number): string {
  const select = ['title', 'slug', 'venue', 'startDate', 'endDate', 'status', 'frames']
    .map((name) => `select[${name}]=true`)
    .join('&')
  return `/api/exhibitions?where[frames.photographer][equals]=${encodeURIComponent(String(personId))}&sort=-startDate&limit=${limit}&depth=1&${select}&populate[frames][photographer]=true`
}
