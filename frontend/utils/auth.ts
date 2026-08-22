/**
 * The `next` parameter on /account/sign-in: where to send someone once they
 * are in. Only a same-site path is ever honoured - a single leading slash,
 * no protocol, no protocol-relative `//host`, no backslash tricks - so the
 * sign-in page can never be used as an open redirect.
 */
export function safeNextPath(value: unknown, fallback = '/account'): string {
  if (typeof value !== 'string') return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback
  if (/\s/.test(value)) return fallback
  if (value.startsWith('/account/sign-in')) return fallback
  return value
}
