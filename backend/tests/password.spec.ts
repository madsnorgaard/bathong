import { describe, expect, it } from 'vitest'
import { PASSWORD_MIN, passwordProblem } from '../src/lib/password'

describe('passwordProblem (the one rule, server side)', () => {
  it('wants ten characters', () => {
    expect(passwordProblem('short', 'a@b.c')).toBe(`At least ${PASSWORD_MIN} characters.`)
    expect(passwordProblem('exactly-10', 'a@b.c')).toBeNull()
  })
  it('refuses spaces at the ends, allows them inside', () => {
    expect(passwordProblem(' padded padded ', 'a@b.c')).toBe('No spaces at the start or end.')
    expect(passwordProblem('a phrase with spaces', 'a@b.c')).toBeNull()
  })
  it('refuses the email itself, in any case', () => {
    expect(passwordProblem('Someone@Example.org', 'someone@example.org')).toBe(
      'Your password cannot be your email.',
    )
    expect(passwordProblem('someone@example.org1', 'someone@example.org')).toBeNull()
  })
  it('copes without an email', () => {
    expect(passwordProblem('a good long password', null)).toBeNull()
  })
})
