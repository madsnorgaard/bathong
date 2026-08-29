import { describe, it, expect } from 'vitest'
import { isPastWalk, nextWalksQuery, pastWalksQuery, walkNo, walkPath } from '~/utils/walks'

const T = Date.parse('2026-08-29T10:00:00+02:00')

describe('isPastWalk (current until it wraps)', () => {
  it('is not past while the walk is in progress', () => {
    expect(
      isPastWalk({ date: '2026-08-29T06:00:00+02:00', endTime: '2026-08-29T12:00:00+02:00' }, T),
    ).toBe(false)
  })
  it('is past once the wrap time has gone', () => {
    expect(
      isPastWalk({ date: '2026-08-29T06:00:00+02:00', endTime: '2026-08-29T09:59:00+02:00' }, T),
    ).toBe(true)
  })
  it('falls back to the start when no wrap time is set', () => {
    expect(isPastWalk({ date: '2026-08-29T06:00:00+02:00' }, T)).toBe(true)
    expect(isPastWalk({ date: '2026-08-30T06:00:00+02:00' }, T)).toBe(false)
  })
  it('never calls a walk without a date past', () => {
    expect(isPastWalk({}, T)).toBe(false)
  })
})

describe('the two walk queries', () => {
  it('both honour endTime, so a walk in progress stays upcoming', () => {
    const now = '2026-08-29T08:00:00.000Z'
    expect(nextWalksQuery(now, 1)).toContain('[endTime][greater_than_equal]=2026-08-29T08%3A00%3A00.000Z')
    expect(nextWalksQuery(now, 1)).toContain('limit=1')
    expect(pastWalksQuery(now, 10)).toContain('[endTime][less_than]=')
    expect(pastWalksQuery(now, 10)).toContain('[endTime][exists]=false')
  })
  it('skips the frames join on list reads', () => {
    expect(nextWalksQuery('x', 1)).toContain('joins[frames]=false')
  })
})

describe('walkNo and walkPath', () => {
  it('renders the virtual number as № 007 and defaults to the first', () => {
    expect(walkNo({ number: 7 })).toBe('№ 007')
    expect(walkNo({})).toBe('№ 001')
  })
  it('links a slug, or the walks page without one', () => {
    expect(walkPath({ slug: 'walk-001-first-light' })).toBe('/walks/walk-001-first-light')
    expect(walkPath({})).toBe('/walks')
  })
})
