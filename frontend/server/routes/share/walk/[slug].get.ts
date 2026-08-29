import { isPastWalk } from '../../../../utils/walks'

/**
 * C4 walk card for one walk: the jacaranda plate with the date enormous.
 * A walked walk says so in the top line; an upcoming one carries the member
 * price. Unknown or unpublished slugs serve the C1 default.
 */
interface WalkDoc {
  date: string
  endTime?: string | null
  id: number
  meetingPoint?: string | null
  number?: number | null
  priceMember?: number | null
  title: string
}

export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `walk:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: WalkDoc[] }>(
      `/api/walks?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0&joins=false`,
    )
    const walk = list.docs[0]
    if (!walk) return null

    const past = isPastWalk(walk)
    const d = fmtDate(walk.date)
    const suffix = past ? ' · WALKED' : walk.priceMember === 0 ? ' · FREE FOR MEMBERS' : ''
    const overlay = await renderOverlay(
      walkPlate({
        topLine: `WALK № ${pad3(walk.number ?? 1)}${suffix}`,
        dateLines: [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time],
        bottomLine: (walk.meetingPoint ?? walk.title).toUpperCase(),
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
