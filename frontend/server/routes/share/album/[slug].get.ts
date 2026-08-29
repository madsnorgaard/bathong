/**
 * C6 album card: the C2 structure (photograph, credit chip, ink bar) with the
 * album's first photograph and count. Published albums only; anything
 * missing serves the C1 default.
 */
interface AlbumDoc {
  creditOverride?: string | null
  id: number
  images?: Array<Parameters<typeof bestPhotoUrl>[0] | number>
  photographer?: { name?: string | null } | number | null
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
    if (!album) return null
    const first = album.images?.[0]
    const photoUrl = bestPhotoUrl(first && typeof first === 'object' ? first : null)
    if (!photoUrl) return null

    const count = album.images?.length ?? 0
    const photographer =
      album.creditOverride ??
      (typeof album.photographer === 'object' ? album.photographer?.name : null)
    const overlay = await renderOverlay(
      essayOverlay({
        credit: photographer ? `© ${photographer}` : null,
        metaLines: [`ALBUM · ${count} PHOTOGRAPH${count === 1 ? '' : 'S'}`, album.title.toUpperCase()],
      }) as never,
    )
    return composeCard({
      overlay,
      photo: {
        buffer: await fetchPhoto(photoUrl),
        height: CARD_H - 124,
        left: 0,
        top: 0,
        width: CARD_W,
      },
    })
  })
  return buf
})
