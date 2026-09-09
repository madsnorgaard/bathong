import { nextWorkshopsQuery } from '../../../utils/workshops'

/**
 * Workshop card: full jacaranda plate, the next workshop's date enormous,
 * the venue as the bottom line. No upcoming workshop serves the C1 default.
 * "Next" follows the pages' rule: a workshop stays current until it wraps.
 */
interface WorkshopDoc {
  date: string
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
    const overlay = await renderOverlay(
      walkPlate({
        topLine: `WORKSHOP № ${pad3(workshop.number ?? 1)}`,
        dateLines: [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time],
        bottomLine: (workshop.venueName ?? workshop.title).toUpperCase(),
        barLines: ['BOOK ON THE WEBSITE', 'BATHONG.AFRICA/WORKSHOPS'],
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
