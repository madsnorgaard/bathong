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
 * Credit line for a frame. Every photograph is credited, everywhere it
 * appears; the backend refuses frames with neither photographer nor override.
 */
export function frameCredit(frame: CmsFrame): string {
  if (frame.creditOverride) return frame.creditOverride
  const p = frame.photographer
  if (p && typeof p === 'object' && p.name) return p.name
  return 'Bathong. Collective'
}
