import type { FrameLike } from '../../utils/shareCards'

/**
 * The /photographers card: the newest frame by the first photographer on
 * the roster who has one, on the C1 structure, the bar counting the roster.
 * A roster with no frames yet serves the C1 default.
 */
export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `photographers:${version}`, async () => {
    const roster = await cmsGet<{ docs: Array<{ id: number }>; totalDocs: number }>(
      '/api/people?where[onRoster][equals]=true&sort=order&limit=12&depth=0&select[name]=true',
    )
    for (const person of roster.docs) {
      const frames = await cmsGet<{ docs: FrameLike[] }>(
        `/api/frames?where[photographer][equals]=${person.id}&sort=-createdAt&limit=1&depth=1`,
      )
      const photo = framePhoto(frames.docs[0])
      if (!photo) continue
      const n = roster.totalDocs
      return photoCard({
        metaLines: [`PHOTOGRAPHERS · ${n} ON THE ROSTER`, 'BATHONG.AFRICA/PHOTOGRAPHERS'],
        photo,
      })
    }
    return null
  })
  return buf
})
