import { nextWorkshopsQuery } from '../../../utils/workshops'

/**
 * Workshop card: full jacaranda plate, the next workshop's date enormous,
 * the venue as the bottom line. No upcoming workshop serves the C1 default.
 * "Next" follows the pages' rule: a workshop stays current until it wraps.
 */
interface WorkshopDoc {
  date: string
  heroImage?: { url?: string | null } | number | null
  id: number
  number?: number | null
  title: string
  venueName?: string | null
}

export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `workshops:${version}`, async () => {
    const next = await cmsGet<{ docs: WorkshopDoc[] }>(
      nextWorkshopsQuery(new Date().toISOString(), 1),
    )
    const workshop = next.docs[0]
    if (!workshop) return null

    const d = fmtDate(workshop.date)
    const topLine = `WORKSHOP № ${pad3(workshop.number ?? 1)}`
    const dateLines = [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time]
    const bottomLine = (workshop.venueName ?? workshop.title).toUpperCase()

    // With an invite the whole poster travels, contained left; the query
    // runs at depth 1 so it arrives populated. Original file, never a crop.
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
