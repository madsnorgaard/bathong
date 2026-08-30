/**
 * A member-supplied link is only ever rendered as an http(s) href. The API
 * validates on write; this is the belt to that brace, so a value that
 * predates the rule or arrives by another path cannot become a
 * `javascript:` link on the public site.
 */
export function safeHref(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}
