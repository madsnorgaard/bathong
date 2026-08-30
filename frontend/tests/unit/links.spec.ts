import { describe, it, expect } from 'vitest'
import { safeHref } from '~/utils/links'

describe('safeHref', () => {
  it('passes http(s) links through', () => {
    expect(safeHref('https://example.org/work')).toBe('https://example.org/work')
    expect(safeHref(' http://example.org ')).toBe('http://example.org/')
  })
  it('drops everything else', () => {
    expect(safeHref('javascript:alert(1)')).toBeNull()
    expect(safeHref('data:text/html,hi')).toBeNull()
    expect(safeHref('example.org')).toBeNull()
    expect(safeHref('')).toBeNull()
    expect(safeHref(null)).toBeNull()
    expect(safeHref(undefined)).toBeNull()
  })
})
