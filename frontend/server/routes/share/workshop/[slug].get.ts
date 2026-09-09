import { isPastWalk } from '../../../../utils/walks'

/**
 * Workshop card for one workshop: the jacaranda plate with the date
 * enormous, the venue as the bottom line. A held workshop says so in the
 * top line. Unknown or unpublished slugs serve the C1 default.
 */
interface WorkshopDoc {
  date: string
  endTime?: string | null
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
      // joins are skipped per path: a bare joins=false is not honoured by 3.84
      `/api/workshops?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0&joins[albums]=false`,
    )
    const workshop = list.docs[0]
    if (!workshop) return null

    const past = isPastWalk(workshop)
    const d = fmtDate(workshop.date)
    const overlay = await renderOverlay(
      walkPlate({
        topLine: `WORKSHOP № ${pad3(workshop.number ?? 1)}${past ? ' · HELD' : ''}`,
        dateLines: [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time],
        bottomLine: (workshop.venueName ?? workshop.title).toUpperCase(),
        barLines: ['BOOK ON THE WEBSITE', 'BATHONG.AFRICA/WORKSHOPS'],
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
