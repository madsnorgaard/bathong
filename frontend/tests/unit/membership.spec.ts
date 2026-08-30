import { describe, it, expect } from 'vitest'
import { canRenew, effectiveStatus, memberNumberLabel, planLabel, sinceLabel } from '~/utils/membership'

const now = Date.parse('2026-09-01T00:00:00Z')

describe('effectiveStatus', () => {
  it('is active while the date holds, lapsed once it passes', () => {
    expect(effectiveStatus({ membershipStatus: 'active', membershipExpires: '2026-10-01T00:00:00Z' }, now)).toBe('active')
    expect(effectiveStatus({ membershipStatus: 'active', membershipExpires: '2026-08-01T00:00:00Z' }, now)).toBe('lapsed')
    expect(effectiveStatus({ membershipStatus: 'none' }, now)).toBe('none')
    expect(effectiveStatus(null, now)).toBe('none')
  })
})

describe('labels', () => {
  it('never invent a value', () => {
    expect(memberNumberLabel(7)).toBe('№ 0007')
    expect(planLabel('annual')).toBe('Annual')
    expect(planLabel(null)).toBe('TBC')
    expect(sinceLabel('2026-08-29T04:00:00Z')).toBe('August 2026')
    expect(sinceLabel(null)).toBeNull()
  })
})

describe('canRenew', () => {
  it('opens inside the last 30 days, or whenever there is no running membership', () => {
    expect(canRenew({ membershipStatus: 'active', membershipExpires: '2026-12-01T00:00:00Z' }, now)).toBe(false)
    expect(canRenew({ membershipStatus: 'active', membershipExpires: '2026-09-20T00:00:00Z' }, now)).toBe(true)
    expect(canRenew({ membershipStatus: 'none' }, now)).toBe(true)
  })
})
