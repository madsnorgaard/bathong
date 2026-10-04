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

/**
 * The revision of the generated share cards. Platforms cache a card by its
 * URL (Facebook says so in as many words: a changed image needs a new URL),
 * so a link shared while a card was wrong keeps the wrong card until the URL
 * moves. Bump this when the cards change how they look, or after an outage
 * served the wrong image; every og:image on the site moves at once.
 * 2: cards render again after the September 2026 outage (default card
 *    served for every entity).
 */
export const CARD_REVISION = 2

/** A generated card's URL with the revision on it; the static default and foreign URLs pass through. */
export function withCardRevision(image: string): string {
  if (!image.startsWith('/share/') || image.startsWith('/share/default.')) return image
  return `${image}${image.includes('?') ? '&' : '?'}c=${CARD_REVISION}`
}

/** The stable public URL of a page: the configured site origin plus the path, never the request host. */
export function canonicalUrl(siteUrl: string, path: string): string {
  const origin = siteUrl.replace(/\/+$/, '')
  const p = path.startsWith('/') ? path : `/${path}`
  return `${origin}${p}`
}
