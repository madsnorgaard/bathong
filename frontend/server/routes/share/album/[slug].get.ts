import type { AlbumLike } from '../../../utils/shareCards'

/**
 * C6 album card: the C2 structure (photograph, credit chip, ink bar) with the
 * album's first photograph and count. The chip names that photograph's own
 * photographer when the file carries a credit, else the album's. Published
 * albums only; anything missing serves the C1 default.
 */
interface AlbumDoc extends AlbumLike {
  id: number
  slug?: string | null
  title: string
}

export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `album:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: AlbumDoc[] }>(
      `/api/albums?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
    )
    const album = list.docs[0]
    const photo = albumPhoto(album)
    if (!album || !photo) return null

    const count = album.images?.length ?? 0
    return photoCard({
      metaLines: [`ALBUM · ${count} PHOTOGRAPH${count === 1 ? '' : 'S'}`, barLine(album.title)],
      photo,
    })
  })
  return buf
})
