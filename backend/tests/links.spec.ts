import { describe, expect, it } from 'vitest'
import { instagramUrl, webLinkProblem } from '../src/lib/links'

describe('webLinkProblem', () => {
  it('accepts empty and parsed http(s) links', () => {
    expect(webLinkProblem(undefined)).toBeNull()
    expect(webLinkProblem('')).toBeNull()
    expect(webLinkProblem('https://example.org/work')).toBeNull()
    expect(webLinkProblem('http://example.org')).toBeNull()
    expect(webLinkProblem('  https://example.org  ')).toBeNull()
  })

  it('refuses scripts, other schemes, bare words and credentials', () => {
    expect(webLinkProblem('javascript:alert(1)')).toMatch(/https:\/\//)
    expect(webLinkProblem('JavaScript:alert(1)')).toMatch(/https:\/\//)
    expect(webLinkProblem('data:text/html,hi')).toMatch(/https:\/\//)
    expect(webLinkProblem('example.org')).toMatch(/https:\/\//)
    expect(webLinkProblem('https://user:pw@example.org')).toMatch(/password/)
    expect(webLinkProblem(42)).toMatch(/https:\/\//)
    expect(webLinkProblem(`https://example.org/${'a'.repeat(300)}`)).toMatch(/200/)
  })

  it('has no em dash in any message', () => {
    for (const v of ['javascript:x', 'https://u:p@x.org', 'x', 'https://x.org/' + 'a'.repeat(300)]) {
      expect(webLinkProblem(v)).not.toContain('—')
    }
  })
})

describe('instagramUrl', () => {
  it('turns a handle into the profile link', () => {
    expect(instagramUrl('@bathong.africa')).toBe('https://www.instagram.com/bathong.africa/')
    expect(instagramUrl('bathong_africa')).toBe('https://www.instagram.com/bathong_africa/')
  })
  it('leaves links alone', () => {
    expect(instagramUrl('https://www.instagram.com/x/')).toBe('https://www.instagram.com/x/')
    expect(instagramUrl('javascript:alert(1)')).toBe('javascript:alert(1)')
  })
})
