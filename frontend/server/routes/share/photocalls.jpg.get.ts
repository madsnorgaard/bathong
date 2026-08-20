/**
 * C5 photocall card: the signal plate, used only while a call is open.
 * Status and deadline above the title, photograph shrunk to the top third.
 * No open call (or no hero image) serves the C1 default - the spec retires
 * this card the day the call closes.
 */
interface PhotocallDoc {
  closesAt?: string | null
  heroImage?: Parameters<typeof bestPhotoUrl>[0] | number | null
  id: number
  title: string
}

export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `photocalls:${version}`, async () => {
    const open = await cmsGet<{ docs: PhotocallDoc[] }>(
      '/api/photocalls?where[status][equals]=open&sort=closesAt&limit=1&depth=2',
    )
    const call = open.docs[0]
    if (!call) return null
    const hero = typeof call.heroImage === 'object' ? call.heroImage : null
    const photoUrl = bestPhotoUrl(hero)
    if (!photoUrl) return null

    const all = await cmsGet<{ docs: Array<{ id: number }> }>(
      '/api/photocalls?limit=100&depth=0&sort=createdAt&select[slug]=true',
    )
    const index = all.docs.findIndex((d) => d.id === call.id) + 1 || 1

    const credit = (hero as { credit?: string | null } | null)?.credit ?? null
    const closes = call.closesAt ? ` · CLOSES ${fmtDate(call.closesAt).shortDayMonth.toUpperCase()}` : ''
    const overlay = await renderOverlay(
      photocallOverlay({
        credit: credit ? `© ${credit}` : null,
        statusLine: `PHOTOCALL ${pad3(index)} · OPEN${closes}`,
        title: call.title.toUpperCase(),
      }) as never,
    )
    return composeCard({
      overlay,
      photo: { buffer: await fetchPhoto(photoUrl), height: 380, left: 0, top: 0, width: CARD_W },
    })
  })
  return buf
})
