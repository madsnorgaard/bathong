import { describe, it, expect } from 'vitest'
import { archiveApiPath, archiveFilters, archivePage, archiveQuery } from '~/utils/archive'

describe('archiveFilters (the URL is the state)', () => {
  it('keeps only known keys, trimmed, first value of arrays', () => {
    expect(archiveFilters({ q: '  rain ', photographer: ['thabo', 'x'], page: '3', evil: '1' })).toEqual({
      q: 'rain',
      photographer: 'thabo',
    })
  })
  it('drops empty strings', () => {
    expect(archiveFilters({ q: '  ', tag: '' })).toEqual({})
  })
  it('keeps the walk filter', () => {
    expect(archiveFilters({ walk: 'demo-past-walk' })).toEqual({ walk: 'demo-past-walk' })
  })
})

describe('archiveQuery (merge a filter change)', () => {
  it('sets a filter while preserving the others and dropping page', () => {
    expect(archiveQuery({ photographer: 'thabo', page: '2' }, { year: '2026' })).toEqual({
      photographer: 'thabo',
      year: '2026',
    })
  })
  it('clears a filter with undefined or empty string', () => {
    expect(archiveQuery({ photographer: 'thabo', tag: 'demo' }, { photographer: undefined })).toEqual({ tag: 'demo' })
    expect(archiveQuery({ photographer: 'thabo' }, { photographer: '' })).toEqual({})
  })
})

describe('archivePage', () => {
  it('omits page 1 and keeps filters', () => {
    expect(archivePage({ tag: 'demo', page: '4' }, 1)).toEqual({ tag: 'demo' })
    expect(archivePage({ tag: 'demo' }, 2)).toEqual({ tag: 'demo', page: '2' })
  })
})

describe('archiveApiPath', () => {
  it('is the bare endpoint with no filters', () => {
    expect(archiveApiPath({})).toBe('/api/archive')
  })
  it('encodes filters and a page beyond the first', () => {
    expect(archiveApiPath({ q: 'church square', page: '2' })).toBe('/api/archive?q=church+square&page=2')
    expect(archiveApiPath({ q: 'x', page: '1' })).toBe('/api/archive?q=x')
    expect(archiveApiPath({ page: 'abc' })).toBe('/api/archive')
  })
  it('passes the walk slug through', () => {
    expect(archiveApiPath({ walk: 'demo-past-walk' })).toBe('/api/archive?walk=demo-past-walk')
  })
})
