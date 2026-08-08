import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatWalkDate,
  formatWalkTime,
  walkNumber,
  frameIndex,
  sectionIndex,
} from '~/utils/format'

describe('formatPrice (the honest placeholder rule)', () => {
  it('renders R - for unset prices, never inventing a number', () => {
    expect(formatPrice(null)).toBe('R -')
    expect(formatPrice(undefined)).toBe('R -')
  })
  it('renders Free for zero', () => {
    expect(formatPrice(0)).toBe('Free')
  })
  it('renders rand amounts', () => {
    expect(formatPrice(150)).toBe('R 150')
  })
})

describe('walk dates in SAST', () => {
  it('renders TBC when unset', () => {
    expect(formatWalkDate(null)).toBe('TBC')
    expect(formatWalkTime(undefined)).toBe('TBC')
  })
  it('renders walk 001 correctly', () => {
    expect(formatWalkDate('2026-08-29T05:30:00+02:00')).toBe('Saturday, 29 August 2026')
    expect(formatWalkTime('2026-08-29T05:30:00+02:00')).toBe('05:30')
  })
})

describe('archive numbering', () => {
  it('walks use №', () => {
    expect(walkNumber(1)).toBe('№ 001')
  })
  it('frames use 04 / 12', () => {
    expect(frameIndex(4, 12)).toBe('04 / 12')
  })
  it('sections use 02 /', () => {
    expect(sectionIndex(2)).toBe('02 /')
  })
})
