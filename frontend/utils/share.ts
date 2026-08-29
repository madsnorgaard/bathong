/**
 * Share links in the collective's voice: "Bathong!" is what you say when
 * you have to show someone. Plain links only (WhatsApp, mail), no scripts
 * from anyone else.
 */

/** The message a share carries: the voice, the title, the link on its own line. */
export function shareText(title: string, url: string): string {
  return `Bathong! ${title}\n${url}`
}

export function shareLinks(title: string, url: string): { whatsapp: string; email: string } {
  const text = shareText(title, url)
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
    email: `mailto:?subject=${encodeURIComponent(`Bathong! ${title}`)}&body=${encodeURIComponent(text)}`,
  }
}

/** The stable public URL of a page: the configured site origin plus the path, never the request host. */
export function canonicalUrl(siteUrl: string, path: string): string {
  const origin = siteUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${origin}${p}`
}
