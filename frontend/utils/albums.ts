/**
 * Album helpers shared by the homepage, the /albums index and the event
 * record pages: the newest-first list query and the cover/credit readers.
 */
import type { Album, Media } from '~/types/payload-types'

/** Newest albums first; depth 1 so images arrive as Media and the photographer populated. */
export function latestAlbumsQuery(limit: number): string {
  return `/api/albums?sort=-date&limit=${limit}&depth=1`
}

export function albumCover(album: Album): Media | null {
  const first = album.images?.[0]
  return first && typeof first === 'object' ? first : null
}

/** Credit is non-negotiable: override, then the profile, then the collective. */
export function albumCredit(album: Album): string {
  const p = album.photographer
  return album.creditOverride ?? (p && typeof p === 'object' ? p.name : null) ?? 'Bathong. Collective'
}
