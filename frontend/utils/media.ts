interface CmsMedia {
  url?: string | null
  alt?: string | null
  credit?: string | null
}

interface CmsFrame {
  image?: CmsMedia | string | null
  photographer?: { name?: string | null } | string | null
  creditOverride?: string | null
  caption?: string | null
  location?: string | null
}

/** Absolute URL for a Payload media doc (its url is relative to the CMS origin). */
export function mediaUrl(media: CmsMedia | string | null | undefined, cmsUrl: string): string | null {
  if (!media || typeof media === 'string' || !media.url) return null
  if (/^https?:\/\//.test(media.url)) return media.url
  return `${cmsUrl.replace(/\/$/, '')}${media.url}`
}

/**
 * Relative CMS media path for NuxtImg/NuxtPicture. Relative srcs are resolved
 * by ipx through the '/api/media' alias (nuxt.config image.alias), so the
 * server fetches sources over the internal network. CRITICAL: Payload
 * prefixes media.url with its serverURL in production (absolute), and an
 * absolute src bypasses the alias - ipx then fetches the public api host,
 * which the container cannot reach (hairpin) and every image hangs. So any
 * URL whose path is a Payload media path is reduced to that path; only
 * genuinely external URLs pass through. mediaUrl stays for og/share images
 * (crawlers need absolute URLs).
 */
export function mediaSrc(media: CmsMedia | string | null | undefined): string | null {
  if (!media || typeof media === 'string' || !media.url) return null
  if (/^https?:\/\//.test(media.url)) {
    try {
      const path = new URL(media.url).pathname
      if (path.startsWith('/api/media/')) return path
    } catch { /* fall through: not a parseable URL */ }
    return media.url
  }
  return media.url
}

/**
 * Credit line for a frame. Every photograph is credited, everywhere it
 * appears; the backend refuses frames with neither photographer nor override.
 */
export function frameCredit(frame: CmsFrame): string {
  if (frame.creditOverride) return frame.creditOverride
  const p = frame.photographer
  if (p && typeof p === 'object' && p.name) return p.name
  return 'Bathong. Collective'
}
