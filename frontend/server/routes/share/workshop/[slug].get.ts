import { isPastWalk } from '../../../../utils/walks'

/**
 * Workshop card for one workshop. With an invite (heroImage), the whole
 * poster sits contained on the left and the jacaranda plate carries the
 * facts on the right, the C3 split language; without one, the type plate
 * alone. Unknown or unpublished slugs serve the C1 default.
 */
interface WorkshopDoc {
  date: string
  endTime?: string | null
  heroImage?: { url?: string | null } | number | null
  id: number
  number?: number | null
  title: string
  venueName?: string | null
}

export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `workshop:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: WorkshopDoc[] }>(
      // depth 1 so the invite arrives; joins skipped per path (a bare
      // joins=false is not honoured by 3.84)
      `/api/workshops?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=1&joins[albums]=false`,
    )
    const workshop = list.docs[0]
    if (!workshop) return null

    const past = isPastWalk(workshop)
    const d = fmtDate(workshop.date)
    const topLine = `WORKSHOP № ${pad3(workshop.number ?? 1)}${past ? ' · HELD' : ''}`
    const dateLines = [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time]
    const bottomLine = (workshop.venueName ?? workshop.title).toUpperCase()

    // The invite is the original file, never a crop: og/feature sizes are
    // cover crops that would slice a designed poster.
    const invite = typeof workshop.heroImage === 'object' ? workshop.heroImage?.url : null
    if (invite) {
      const overlay = await renderOverlay(
        workshopInviteOverlay({
          topLine,
          dateLines,
          bottomLine,
          metaLine: 'BATHONG.AFRICA/WORKSHOPS',
        }) as never,
      )
      return composeCard({
        overlay,
        photo: {
          buffer: await fetchPhoto(invite),
          height: CARD_H,
          left: 0,
          top: 0,
          width: 640,
          fit: 'contain',
        },
      })
    }

    const overlay = await renderOverlay(
      walkPlate({
        topLine,
        dateLines,
        bottomLine,
        barLines: ['BOOK ON THE WEBSITE', 'BATHONG.AFRICA/WORKSHOPS'],
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
