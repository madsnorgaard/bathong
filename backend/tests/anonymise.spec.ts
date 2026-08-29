import { describe, expect, it } from 'vitest'
import { FORMER_MEMBER, anonymisedEmail } from '../src/lib/anonymise'

describe('anonymise', () => {
  it('makes a valid, undeliverable address keyed on the account id', () => {
    expect(anonymisedEmail(42)).toBe('deleted-42@example.invalid')
    expect(anonymisedEmail(42)).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
  })
  it('names nobody', () => {
    expect(FORMER_MEMBER).toBe('Former member')
  })
})
