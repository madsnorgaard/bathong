/**
 * Links a member may publish on their own page. They render as plain hrefs
 * on the public site, so only parsed http(s) URLs get through: never a
 * `javascript:` or `data:` scheme, never a credential in the URL.
 */
export const LINK_MAX = 200

export function webLinkProblem(value: unknown): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string') return 'A full link, starting with https://'
  const v = value.trim()
  if (v.length > LINK_MAX) return `A link of at most ${LINK_MAX} characters.`
  let url: URL
  try {
    url = new URL(v)
  } catch {
    return 'A full link, starting with https://'
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'A full link, starting with https://'
  if (url.username || url.password) return 'A link without a password in it.'
  return null
}

/** `@handle` or `handle` becomes the Instagram profile link; full links pass through untouched. */
export function instagramUrl(value: string): string {
  const v = value.trim()
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(v)) return `https://www.instagram.com/${v.replace(/^@/, '')}/`
  return v
}
