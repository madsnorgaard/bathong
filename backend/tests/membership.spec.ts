import { describe, expect, it } from 'vitest'
import { activationBase, daysUntil, makeReference, nextExpiry, orderAmount } from '../src/lib/membership'

const at = (iso: string) => new Date(iso)

describe('nextExpiry', () => {
  it('adds a month, clamped to the month end', () => {
    expect(nextExpiry(at('2026-01-31T04:00:00Z'), 'monthly').toISOString()).toBe('2026-02-28T04:00:00.000Z')
    expect(nextExpiry(at('2026-08-30T04:00:00Z'), 'monthly').toISOString()).toBe('2026-09-30T04:00:00.000Z')
    expect(nextExpiry(at('2026-12-15T04:00:00Z'), 'monthly').toISOString()).toBe('2027-01-15T04:00:00.000Z')
  })
  it('adds a year, clamped on a leap day', () => {
    expect(nextExpiry(at('2028-02-29T04:00:00Z'), 'annual').toISOString()).toBe('2029-02-28T04:00:00.000Z')
    expect(nextExpiry(at('2026-08-30T04:00:00Z'), 'annual').toISOString()).toBe('2027-08-30T04:00:00.000Z')
  })
})

describe('activationBase', () => {
  const paid = at('2026-09-01T10:00:00Z')
  it('stacks on a running membership', () => {
    expect(activationBase({ membershipStatus: 'active', membershipExpires: '2026-09-20T00:00:00Z' }, paid).toISOString()).toBe(
      '2026-09-20T00:00:00.000Z',
    )
  })
  it('starts on the payment day when lapsed, none, or already past', () => {
    expect(activationBase({ membershipStatus: 'lapsed', membershipExpires: '2026-09-20T00:00:00Z' }, paid)).toBe(paid)
    expect(activationBase({ membershipStatus: 'active', membershipExpires: '2026-08-01T00:00:00Z' }, paid)).toBe(paid)
    expect(activationBase({}, paid)).toBe(paid)
  })
})

describe('makeReference', () => {
  it('reads PREFIX-XXXXXX from an unambiguous alphabet', () => {
    const ref = makeReference('btg')
    expect(ref).toMatch(/^BTG-[A-HJ-NP-Z2-9]{6}$/)
  })
  it('cleans the prefix and falls back to BTG', () => {
    expect(makeReference('ba thong!!', () => 0)).toBe('BATHON-AAAAAA')
    expect(makeReference('', () => 1)).toBe('BTG-BBBBBB')
  })
})

describe('orderAmount', () => {
  const prices = { joiningFee: 250, priceMonthly: 100, priceAnnual: 1000 }
  it('adds the joining fee only for a first membership', () => {
    expect(orderAmount(prices, false, 'annual')).toEqual({ amount: 1250, joiningFee: 250 })
    expect(orderAmount(prices, true, 'annual')).toEqual({ amount: 1000, joiningFee: 0 })
    expect(orderAmount(prices, false, 'monthly')).toEqual({ amount: 350, joiningFee: 250 })
  })
  it('is null while a price is unset (the site shows R - then)', () => {
    expect(orderAmount({ joiningFee: 250 }, false, 'monthly')).toBeNull()
  })
})

describe('daysUntil', () => {
  it('rounds up to whole days', () => {
    expect(daysUntil('2026-09-30T00:00:00Z', at('2026-09-01T12:00:00Z'))).toBe(29)
    expect(daysUntil('2026-08-01T00:00:00Z', at('2026-09-01T12:00:00Z'))).toBeLessThan(0)
  })
})
