/**
 * The password rule, in one place for the API and mirrored on the site
 * (frontend/utils/password.ts). Length over cleverness: ten characters,
 * no stray spaces, and not the email it belongs to.
 */
export const PASSWORD_MIN = 10

export function passwordProblem(password: string, email?: string | null): string | null {
  if (password.length < PASSWORD_MIN) return `At least ${PASSWORD_MIN} characters.`
  if (password !== password.trim()) return 'No spaces at the start or end.'
  if (email && password.toLowerCase() === email.trim().toLowerCase()) {
    return 'Your password cannot be your email.'
  }
  return null
}
