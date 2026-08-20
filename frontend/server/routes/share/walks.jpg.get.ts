/**
 * C4 walk card: full jacaranda plate, the next walk's date enormous.
 * The type-led plate is the spec's launch-only state (no photograph exists
 * before the first walk happens). No upcoming walk serves the C1 default.
 */
interface WalkDoc {
  date: string
  id: number
  meetingPoint?: string | null
  priceMember?: number | null
  title: string
}

export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `walks:${version}`, async () => {
    const now = new Date().toISOString()
    const next = await cmsGet<{ docs: WalkDoc[] }>(
      `/api/walks?where[date][greater_than_equal]=${encodeURIComponent(now)}&sort=date&limit=1&depth=0`,
    )
    const walk = next.docs[0]
    if (!walk) return null

    // Walk number: position in date order across all walks.
    const all = await cmsGet<{ docs: Array<{ id: number }> }>(
      '/api/walks?limit=100&depth=0&sort=date&select[slug]=true',
    )
    const index = all.docs.findIndex((d) => d.id === walk.id) + 1 || 1

    const d = fmtDate(walk.date)
    const overlay = await renderOverlay(
      walkPlate({
        topLine: `WALK № ${pad3(index)}${walk.priceMember === 0 ? ' · FREE FOR MEMBERS' : ''}`,
        dateLines: [d.weekday.toUpperCase(), d.dayMonth.toUpperCase(), d.time],
        bottomLine: (walk.meetingPoint ?? walk.title).toUpperCase(),
      }) as never,
    )
    return composeCard({ overlay })
  })
  return buf
})
