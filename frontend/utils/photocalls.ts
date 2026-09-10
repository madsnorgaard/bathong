/**
 * The one open call, newest first. The homepage and /photocalls share the
 * 'photocall-open' useAsyncData key, and shared keys demand byte-identical
 * queries: this builder is the single source of that string.
 */
export function openPhotocallQuery(): string {
  return '/api/photocalls?where[status][equals]=open&sort=-opensAt&limit=1&depth=0'
}
