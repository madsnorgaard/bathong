/**
 * C2 essay card: the lead frame with the essay's index, frame count and
 * title in the bar. Published essays only (anonymous CMS read); anything
 * missing serves the C1 default.
 */
interface EssayDoc {
  id: number
  leadFrame?: {
    caption?: string | null
    creditOverride?: string | null
    id: number
    image?: Parameters<typeof bestPhotoUrl>[0]
    photographer?: { name?: string | null } | number | null
  } | number | null
  publishedDate?: string | null
  sequence?: Array<{
    blockType: 'frame' | 'pair' | 'text'
    frame?: { id: number } | number | null
    left?: { id: number } | number | null
    right?: { id: number } | number | null
  }>
  slug?: string | null
  title: string
}

export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `essay:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: EssayDoc[] }>(
      `/api/essays?where[slug][equals]=${encodeURIComponent(slug)}&depth=2&limit=1`,
    )
    const essay = list.docs[0]
    if (!essay || typeof essay.leadFrame !== 'object' || !essay.leadFrame) return null
    const lead = essay.leadFrame
    const photoUrl = bestPhotoUrl(typeof lead.image === 'object' ? lead.image : null)
    if (!photoUrl) return null

    // Essay index: position in publishedDate order, oldest first.
    const all = await cmsGet<{ docs: Array<{ id: number }> }>(
      '/api/essays?limit=100&depth=0&sort=publishedDate&select[slug]=true',
    )
    const index = all.docs.findIndex((d) => d.id === essay.id) + 1 || 1

    const relId = (v: { id: number } | number | null | undefined) =>
      v == null ? null : typeof v === 'object' ? v.id : v
    const frameIds: number[] = []
    for (const b of essay.sequence ?? []) {
      if (b.blockType === 'frame') frameIds.push(relId(b.frame) ?? -1)
      if (b.blockType === 'pair') frameIds.push(relId(b.left) ?? -1, relId(b.right) ?? -1)
    }
    const frameCount = frameIds.length
    const leadPos = frameIds.indexOf(lead.id) + 1

    const photographer =
      lead.creditOverride ??
      (typeof lead.photographer === 'object' ? lead.photographer?.name : null)
    const credit = photographer
      ? `© ${photographer}${leadPos ? ` · FRAME ${String(leadPos).padStart(2, '0')} / ${String(frameCount).padStart(2, '0')}` : ''}`
      : null

    const overlay = await renderOverlay(
      essayOverlay({
        credit,
        metaLines: [
          `ESSAY ${pad3(index)} · ${frameCount} FRAME${frameCount === 1 ? '' : 'S'}`,
          essay.title.toUpperCase(),
        ],
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
