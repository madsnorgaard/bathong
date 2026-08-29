import { nextWalksQuery } from '../../../utils/walks'

/**
 * C4 walk card: full jacaranda plate, the next walk's date enormous.
 * The type-led plate is the spec's launch-only state (no photograph exists
 * before the first walk happens). No upcoming walk serves the C1 default.
 * "Next" follows the pages' rule: a walk stays current until it wraps.
 */
interface WalkDoc {
  date: string
  id: number
  meetingPoint?: string | null
  number?: number | null
  priceMember?: number | null
  title: string
}

export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `walks:${version}`, async () => {
    const next = await cmsGet<{ docs: WalkDoc[] }>(nextWalksQuery(new Date().toISOString(), 1))
    const walk = next.docs[0]
    if (!walk) return null

    const d = fmtDate(walk.date)
    const overlay = await renderOverlay(
      walkPlate({
        topLine: `WALK № ${pad3(walk.number ?? 1)}${walk.priceMember === 0 ? ' · FREE FOR MEMBERS' : ''}`,
        dateLines: [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time],
        bottomLine: (walk.meetingPoint ?? walk.title).toUpperCase(),
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
