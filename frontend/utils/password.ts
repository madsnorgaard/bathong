/**
 * The password rule, mirrored from backend/src/lib/password.ts so a field
 * can say what is wrong before the request goes. The API is the judge.
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
