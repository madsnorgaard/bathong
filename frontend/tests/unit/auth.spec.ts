import { describe, it, expect } from 'vitest'
import { safeNextPath } from '~/utils/auth'

describe('safeNextPath (no open redirect off the sign-in page)', () => {
  it('keeps a plain site path', () => {
    expect(safeNextPath('/account')).toBe('/account')
    expect(safeNextPath('/photocalls?x=1#submit')).toBe('/photocalls?x=1#submit')
  })
  it('falls back for anything that is not a single-slash relative path', () => {
    expect(safeNextPath('https://evil.example')).toBe('/account')
    expect(safeNextPath('//evil.example')).toBe('/account')
    expect(safeNextPath('/\\evil.example')).toBe('/account')
    expect(safeNextPath('account')).toBe('/account')
    expect(safeNextPath('')).toBe('/account')
    expect(safeNextPath(null)).toBe('/account')
    expect(safeNextPath(['/a'])).toBe('/account')
    expect(safeNextPath('/a b')).toBe('/account')
  })
  it('never loops back onto the sign-in page itself', () => {
    expect(safeNextPath('/account/sign-in?next=/x')).toBe('/account')
  })
  it('honours a custom fallback', () => {
    expect(safeNextPath(undefined, '/')).toBe('/')
  })
})
