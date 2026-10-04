import { describe, it, expect } from 'vitest'
import {
  exhibitionDateLines,
  exhibitionDates,
  exhibitionFrames,
  exhibitionLead,
  exhibitionPath,
  exhibitionPhase,
  exhibitionPhotographers,
  exhibitionQuery,
  exhibitionsQuery,
  framesOnWall,
  orderExhibitions,
  photographerExhibitionsQuery,
} from '~/utils/exhibitions'
import { formatWalkDate } from '~/utils/format'

// Sunday 4 October 2026, 10:00 SAST
const NOW = Date.parse('2026-10-04T10:00:00+02:00')

describe('exhibitionPhase (the dates decide where they can)', () => {
  it('is current from the first day through the whole of the last', () => {
    expect(exhibitionPhase({ startDate: '2026-10-01T10:00:00Z', endDate: '2026-10-31T10:00:00Z' }, NOW)).toBe('current')
    // closes today: still on, whatever hour the editor saved
    expect(exhibitionPhase({ startDate: '2026-10-01T10:00:00Z', endDate: '2026-10-03T22:30:00Z' }, NOW)).toBe('current')
    // opens today
    expect(exhibitionPhase({ startDate: '2026-10-04T16:00:00Z', endDate: '2026-10-31T10:00:00Z' }, NOW)).toBe('current')
  })
  it('is past once the last day has gone, upcoming until the first', () => {
    expect(exhibitionPhase({ startDate: '2026-09-01T10:00:00Z', endDate: '2026-10-03T10:00:00Z' }, NOW)).toBe('past')
    expect(exhibitionPhase({ startDate: '2026-10-05T10:00:00Z', endDate: '2026-10-31T10:00:00Z' }, NOW)).toBe('upcoming')
  })
  it('lets the dates overrule a status that was not kept up', () => {
    expect(
      exhibitionPhase({ startDate: '2026-09-01T10:00:00Z', endDate: '2026-09-20T10:00:00Z', status: 'current' }, NOW),
    ).toBe('past')
    expect(exhibitionPhase({ startDate: '2026-11-01T10:00:00Z', status: 'current' }, NOW)).toBe('upcoming')
  })
  it("falls back to the editor's status when a date is missing", () => {
    expect(exhibitionPhase({ startDate: '2026-09-01T10:00:00Z', status: 'past' }, NOW)).toBe('past')
    expect(exhibitionPhase({ status: 'current' }, NOW)).toBe('current')
  })
  it('with neither: opened means current, no opening day means still to come', () => {
    expect(exhibitionPhase({ startDate: '2026-09-01T10:00:00Z' }, NOW)).toBe('current')
    expect(exhibitionPhase({}, NOW)).toBe('upcoming')
    expect(exhibitionPhase({ endDate: '2026-10-31T10:00:00Z' }, NOW)).toBe('upcoming')
  })
})

describe('orderExhibitions (on now, then coming up, then the record)', () => {
  const docs = [
    { id: 'old', startDate: '2026-03-01T10:00:00Z', endDate: '2026-03-20T10:00:00Z' },
    { id: 'later', startDate: '2026-12-01T10:00:00Z', endDate: '2026-12-20T10:00:00Z' },
    { id: 'now', startDate: '2026-10-01T10:00:00Z', endDate: '2026-10-31T10:00:00Z' },
    { id: 'recent', startDate: '2026-08-01T10:00:00Z', endDate: '2026-08-20T10:00:00Z' },
    { id: 'undated' },
    { id: 'soon', startDate: '2026-10-10T10:00:00Z', endDate: '2026-10-20T10:00:00Z' },
  ]
  it('puts what is on first, then what opens soonest, undated last', () => {
    expect(orderExhibitions(docs, NOW).live.map((d) => d.id)).toEqual(['now', 'soon', 'later', 'undated'])
  })
  it('keeps the record newest first', () => {
    expect(orderExhibitions(docs, NOW).past.map((d) => d.id)).toEqual(['recent', 'old'])
  })
})

describe('exhibition dates (never invented, always through formatWalkDate)', () => {
  // the weekday separator differs between ICU versions, so the helper is the reference
  const third = formatWalkDate('2026-10-03T10:00:00Z')
  const last = formatWalkDate('2026-10-31T10:00:00Z')
  it('reads a run as two lines and one sentence', () => {
    const e = { startDate: '2026-10-03T10:00:00Z', endDate: '2026-10-31T10:00:00Z' }
    expect(third).toMatch(/^Saturday,? 3 October 2026$/)
    expect(exhibitionDateLines(e)).toEqual([third, `to ${last}`])
    expect(exhibitionDates(e)).toBe(`${third} to ${last}`)
  })
  it('reads one day as one day', () => {
    expect(exhibitionDateLines({ startDate: '2026-10-03T08:00:00Z', endDate: '2026-10-03T16:00:00Z' })).toEqual([
      third,
    ])
  })
  it('says what it knows when a date is missing, and TBC when both are', () => {
    expect(exhibitionDates({ startDate: '2026-10-03T10:00:00Z' })).toBe(`From ${third}`)
    expect(exhibitionDates({ endDate: '2026-10-31T10:00:00Z' })).toBe(`Until ${last}`)
    expect(exhibitionDates({})).toBe('Dates TBC')
  })
})

const media = (name: string, credit?: string | null) => ({ url: `/api/media/file/${name}.jpg`, credit })
const mads = { id: 4, name: 'Mads Nørgaard', slug: 'mads-norgaard' }
const alet = { id: 3, name: 'Alet Pretorius', slug: 'alet-pretorius' }

describe('exhibitionLead (the photograph never travels without a credit)', () => {
  it('is the hero image, credited from the file', () => {
    const lead = exhibitionLead({
      heroImage: media('hero', 'Alet Pretorius'),
      frames: [{ id: 1, image: media('a'), photographer: mads }],
    })
    expect(lead).toEqual({ media: media('hero', 'Alet Pretorius'), credit: 'Alet Pretorius' })
  })
  it('credits a hero file with no credit to the collective', () => {
    expect(exhibitionLead({ heroImage: media('hero', ' ') })?.credit).toBe('Bathong. Collective')
  })
  it('falls back to the first frame with a picture, by the frame credit rule', () => {
    const frames = [
      { id: 1, image: 12, photographer: mads },
      { id: 2, image: media('b'), photographer: mads, creditOverride: 'Guest' },
      { id: 3, image: media('c'), photographer: alet },
    ]
    expect(exhibitionLead({ heroImage: 9, frames })).toEqual({ media: media('b'), credit: 'Guest' })
    expect(exhibitionLead({ frames: [frames[2]!] })?.credit).toBe('Alet Pretorius')
  })
  it('is null while there is no photograph to show', () => {
    expect(exhibitionLead({})).toBeNull()
    expect(exhibitionLead({ heroImage: null, frames: [7, { id: 1, image: 12 }] })).toBeNull()
  })
})

describe('the frames on a wall', () => {
  const wall = {
    frames: [
      { id: 1, image: media('a'), photographer: mads },
      { id: 2, image: media('b'), photographer: alet },
      5,
      { id: 3, image: 44, photographer: mads },
      { id: 4, image: media('d'), photographer: 4 },
      { id: 6, image: media('e'), photographer: null, creditOverride: 'Guest' },
    ],
  }
  it('shows only populated frames with a picture', () => {
    expect(exhibitionFrames(wall).map((f) => f.id)).toEqual([1, 2, 4, 6])
  })
  it('names each photographer with a profile once, in hanging order', () => {
    expect(exhibitionPhotographers(wall).map((p) => p.name)).toEqual(['Mads Nørgaard', 'Alet Pretorius'])
  })
  it('counts one photographer, populated or by id', () => {
    expect(framesOnWall(wall, 4)).toBe(3)
    expect(framesOnWall(wall, 3)).toBe(1)
    expect(framesOnWall(wall, 1)).toBe(0)
    expect(framesOnWall({}, 4)).toBe(0)
  })
})

describe('the exhibition queries', () => {
  it('keeps a populated frame from dragging its walk along', () => {
    for (const q of [exhibitionsQuery(40), exhibitionQuery('a-slug')]) {
      expect(q).toContain('populate[frames][image]=true')
      expect(q).toContain('populate[people][name]=true')
      expect(q).not.toContain('populate[frames][walk]')
    }
  })
  it('asks for the filename with the url, because Payload computes one from the other', () => {
    expect(exhibitionsQuery(40)).toContain('populate[media][filename]=true')
    expect(exhibitionsQuery(40)).toContain('populate[media][url]=true')
    // the card route wants the og rendition, so its media arrives whole
    expect(exhibitionsQuery(40, false)).not.toContain('populate[media]')
  })
  it('finds one exhibition by an encoded slug, deep enough for an essay lead frame', () => {
    const q = exhibitionQuery('a slug')
    expect(q).toContain('where[slug][equals]=a%20slug')
    expect(q).toContain('depth=3')
    expect(q).toContain('populate[essays][leadFrame]=true')
  })
  it("finds the walls that hang one photographer's frames", () => {
    const q = photographerExhibitionsQuery(4, 12)
    expect(q).toContain('where[frames.photographer][equals]=4')
    expect(q).toContain('limit=12')
    expect(q).toContain('populate[frames][photographer]=true')
  })
  it('builds the page path, and the index when there is no slug', () => {
    expect(exhibitionPath({ slug: 'demo-first-hang' })).toBe('/exhibitions/demo-first-hang')
    expect(exhibitionPath({})).toBe('/exhibitions')
  })
})
