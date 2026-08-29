/**
 * C3 photographer card: portrait left at 4/5 with the vertical jacaranda
 * rule, name in display, member number and body of work in mono. Falls back
 * to the newest credited frame when there is no portrait, and to the C1
 * default when there is no photograph at all.
 */
interface PersonDoc {
  basedIn?: string | null
  id: number
  memberNumber?: number | null
  name: string
  portrait?: Parameters<typeof bestPhotoUrl>[0] | number | null
}

export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `photographer:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: PersonDoc[] }>(
      `/api/people?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
    )
    const person = list.docs[0]
    if (!person) return null

    let photoUrl = bestPhotoUrl(typeof person.portrait === 'object' ? person.portrait : null)
    if (!photoUrl) {
      const frames = await cmsGet<{ docs: Array<{ image?: Parameters<typeof bestPhotoUrl>[0] | number }> }>(
        `/api/frames?where[photographer][equals]=${person.id}&sort=-createdAt&limit=1&depth=1`,
      )
      const image = frames.docs[0]?.image
      photoUrl = bestPhotoUrl(typeof image === 'object' ? image : null)
    }
    if (!photoUrl) return null

    const [essays, frames] = await Promise.all([
      cmsGet<{ totalDocs: number }>(`/api/essays?where[contributors][contains]=${person.id}&limit=0`),
      cmsGet<{ totalDocs: number }>(`/api/frames?where[photographer][equals]=${person.id}&limit=0`),
    ])

    const counts: string[] = []
    if (essays.totalDocs) counts.push(`${essays.totalDocs} ESSAY${essays.totalDocs === 1 ? '' : 'S'}`)
    if (frames.totalDocs) counts.push(`${frames.totalDocs} FRAME${frames.totalDocs === 1 ? '' : 'S'}`)

    // The city only when the photographer names one; never a guess.
    const metaTop =
      [person.memberNumber ? `MEMBER № ${pad4(person.memberNumber)}` : null, person.basedIn?.toUpperCase()]
        .filter(Boolean)
        .join(' · ') || 'PHOTOGRAPHER'
    const overlay = await renderOverlay(
      photographerOverlay({
        metaTop,
        nameLines: person.name.toUpperCase().split(' '),
        metaBottom: [counts.join(' · ') || 'PHOTOGRAPHER', 'BATHONG. COLLECTIVE'],
      }) as never,
    )
    return composeCard({
      overlay,
      photo: { buffer: await fetchPhoto(photoUrl), height: CARD_H, left: 0, top: 0, width: 470 },
    })
  })
  return buf
})
