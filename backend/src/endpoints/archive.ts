import type { Endpoint, PayloadRequest, Where } from 'payload'
import type { Frame, Media, Person, Walk } from '../payload-types'

/**
 * GET /api/archive - the searchable open archive (#19) over the frames
 * collection. Public: every frame whose media is public is in the archive,
 * credited, filterable by photographer, walk, year, tag and free text.
 *
 * Search is Payload `like` (compiled to ILIKE on postgres) over caption,
 * location and tags - the "Postgres is enough at this scale" decision from
 * #19. If the archive outgrows it the upgrade path is a generated tsvector
 * column + GIN index behind the same query contract; nothing in the
 * frontend would change.
 *
 * Facets are computed over the WHOLE public archive, not the filtered set,
 * so the filter rows never vanish as you narrow down. Nothing is cached;
 * the archive is a few hundred rows for the foreseeable future.
 */

const PAGE_SIZE = 48
const MAX_Q = 80

const clampInt = (raw: string | null, min: number, max: number, fallback: number): number => {
  const n = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

const text = (raw: string | null, max: number): string => (raw ?? '').trim().slice(0, max)

/**
 * Public-media constraint, shared by the listing and the facet pass. Payload
 * resolves dotted paths across relationship/upload fields as a join, so
 * restricted media (photocall entries under judging) never reach the archive.
 */
const publicOnly: Where = { 'image.visibility': { equals: 'public' } }

type WalkFacet = {
  slug: string
  title: string
  date: string | null
  number: number | null
  count: number
}

type Facets = {
  photographers: { slug: string; name: string; count: number }[]
  walks: WalkFacet[]
  years: { year: number; count: number }[]
  tags: { tag: string; count: number }[]
}

/**
 * Local API reads populate relationships without access control, so a draft
 * walk would come through in full here; only a published walk is public.
 */
const walkOf = (frame: Frame): Walk | null => {
  const walk = frame.walk && typeof frame.walk === 'object' ? (frame.walk as Walk) : null
  return walk && walk._status === 'published' ? walk : null
}

async function facets(payload: PayloadRequest['payload']): Promise<Facets> {
  const { docs } = await payload.find({
    collection: 'frames',
    depth: 1,
    pagination: false,
    where: publicOnly,
    select: { photographer: true, walk: true, year: true, tags: true },
  })

  const people = new Map<string, { slug: string; name: string; count: number }>()
  const walks = new Map<string, WalkFacet>()
  const years = new Map<number, number>()
  const tags = new Map<string, number>()

  for (const frame of docs as Frame[]) {
    const p = typeof frame.photographer === 'object' ? (frame.photographer as Person | null) : null
    if (p?.slug) {
      const entry = people.get(p.slug) ?? { slug: p.slug, name: p.name, count: 0 }
      entry.count += 1
      people.set(p.slug, entry)
    }
    const w = walkOf(frame)
    if (w?.slug) {
      const entry = walks.get(w.slug) ?? {
        slug: w.slug,
        title: w.title,
        date: w.date ?? null,
        number: w.number ?? null,
        count: 0,
      }
      entry.count += 1
      walks.set(w.slug, entry)
    }
    if (typeof frame.year === 'number') years.set(frame.year, (years.get(frame.year) ?? 0) + 1)
    for (const t of frame.tags ?? []) tags.set(t, (tags.get(t) ?? 0) + 1)
  }

  return {
    photographers: [...people.values()].sort((a, b) => a.name.localeCompare(b.name)),
    walks: [...walks.values()].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
    years: [...years.entries()]
      .map(([year, count]) => ({ year, count }))
      .sort((a, b) => b.year - a.year),
    tags: [...tags.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag)),
  }
}

export const archive: Endpoint = {
  path: '/archive',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    const params = new URL(req.url ?? 'http://localhost').searchParams
    const q = text(params.get('q'), MAX_Q)
    const photographerSlug = text(params.get('photographer'), 80)
    const walkSlug = text(params.get('walk'), 80)
    const tag = text(params.get('tag'), 60)
    const year = clampInt(params.get('year'), 1800, 2200, 0)
    const page = clampInt(params.get('page'), 1, 10_000, 1)

    const { payload } = req
    const filters: Where[] = [publicOnly]

    if (photographerSlug) {
      const people = await payload.find({
        collection: 'people',
        where: { slug: { equals: photographerSlug } },
        limit: 1,
        depth: 0,
      })
      const person = people.docs[0]
      if (!person) {
        // An unknown photographer is an empty shelf, not a client error.
        return Response.json({
          docs: [],
          page: 1,
          totalPages: 1,
          totalDocs: 0,
          facets: await facets(payload),
        })
      }
      filters.push({ photographer: { equals: person.id } })
    }
    if (walkSlug) {
      // Local API reads skip access control, so the published clause is explicit.
      const walks = await payload.find({
        collection: 'walks',
        where: { and: [{ slug: { equals: walkSlug } }, { _status: { equals: 'published' } }] },
        limit: 1,
        depth: 0,
      })
      const walk = walks.docs[0]
      if (!walk) {
        return Response.json({
          docs: [],
          page: 1,
          totalPages: 1,
          totalDocs: 0,
          facets: await facets(payload),
        })
      }
      filters.push({ walk: { equals: walk.id } })
    }
    if (year) filters.push({ year: { equals: year } })
    if (tag) filters.push({ tags: { contains: tag } })
    if (q) {
      filters.push({
        or: [{ caption: { like: q } }, { location: { like: q } }, { tags: { contains: q } }],
      })
    }

    const result = await payload.find({
      collection: 'frames',
      depth: 1,
      sort: '-year,-createdAt',
      page,
      limit: PAGE_SIZE,
      where: { and: filters },
    })

    const docs = (result.docs as Frame[]).map((frame) => {
      const image = typeof frame.image === 'object' ? (frame.image as Media | null) : null
      const photographer =
        typeof frame.photographer === 'object' ? (frame.photographer as Person | null) : null
      const walk = walkOf(frame)
      return {
        id: frame.id,
        caption: frame.caption ?? null,
        location: frame.location ?? null,
        year: frame.year ?? null,
        tags: frame.tags ?? [],
        thumb: image?.sizes?.card?.url ?? image?.url ?? null,
        full: image?.sizes?.hero?.url ?? image?.url ?? null,
        width: image?.width ?? null,
        height: image?.height ?? null,
        alt: image?.alt ?? null,
        photographerSlug: photographer?.slug ?? null,
        photographerName: photographer?.name ?? null,
        credit: frame.creditOverride ?? photographer?.name ?? null,
        walkSlug: walk?.slug ?? null,
        walkTitle: walk?.title ?? null,
        walkNumber: walk?.number ?? null,
      }
    })

    return Response.json({
      docs,
      page: result.page ?? page,
      totalPages: result.totalPages ?? 1,
      totalDocs: result.totalDocs ?? docs.length,
      facets: await facets(payload),
    })
  },
}
