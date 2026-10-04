import { exhibitionCardQuery, exhibitionLead } from '../../../../utils/exhibitions'
import type { Exhibition } from '../../../../types/payload-types'

/**
 * The card for one exhibition: the C2 structure (photograph, credit chip, ink
 * bar) led by the hero image, else the first frame on the wall, the bar
 * carrying the dates and the title. The chip names the hero file's own
 * credit or the frame's photographer. An exhibition announced before it has
 * a photograph gets the type plate with its dates. Published exhibitions
 * only; an unknown slug serves the C1 default.
 */
const SAST = 'Africa/Johannesburg'
const year = (iso: string) =>
  new Intl.DateTimeFormat('en-ZA', { timeZone: SAST, year: 'numeric' }).format(new Date(iso))

/** The dates as the cards set them, a line per day; never invented. */
function dateLines(exhibition: Exhibition, form: 'dayMonth' | 'shortDayMonth'): string[] {
  const { startDate, endDate } = exhibition
  const day = (iso: string) => fmtDate(iso)[form].toUpperCase()
  if (startDate && endDate) {
    const [from, to] = [day(startDate), day(endDate)]
    return from === to && year(startDate) === year(endDate)
      ? [`${from} ${year(endDate)}`]
      : [from, `TO ${to} ${year(endDate)}`]
  }
  if (startDate) return [`FROM ${day(startDate)} ${year(startDate)}`]
  if (endDate) return [`UNTIL ${day(endDate)} ${year(endDate)}`]
  return ['DATES TBC']
}

export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `exhibition:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: Exhibition[] }>(exhibitionCardQuery(slug))
    const exhibition = list.docs[0]
    if (!exhibition) return null

    const lead = exhibitionLead(exhibition)
    const url = bestPhotoUrl(lead?.media)
    if (lead && url) {
      return photoCard({
        metaLines: [
          barLine(`EXHIBITION · ${dateLines(exhibition, 'shortDayMonth').join(' ')}`),
          barLine(exhibition.title),
        ],
        photo: { credit: lead.credit, url },
      })
    }

    const overlay = await renderOverlay(
      walkPlate({
        topLine: 'EXHIBITION',
        dateLines: dateLines(exhibition, 'dayMonth'),
        bottomLine: (exhibition.venue ?? 'VENUE TBC').toUpperCase(),
        barLines: [barLine(exhibition.title), 'BATHONG.AFRICA/EXHIBITIONS'],
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
