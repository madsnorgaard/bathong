import type { FrameLike } from '../../utils/shareCards'

/**
 * The /archive card: the frame that leads the homepage (the newest top
 * pick, else the newest frame) on the C1 structure, the bar counting the
 * archive. An empty archive serves the C1 default.
 */
interface FrameList {
  docs: FrameLike[]
  totalDocs: number
}

export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `archive:${version}`, async () => {
    const [picks, newest] = await Promise.all([
      cmsGet<FrameList>('/api/frames?where[topPick][equals]=true&sort=-createdAt&limit=1&depth=1'),
      cmsGet<FrameList>('/api/frames?sort=-createdAt&limit=1&depth=1'),
    ])
    const photo = framePhoto(picks.docs[0]) ?? framePhoto(newest.docs[0])
    if (!photo) return null
    const n = newest.totalDocs
    return photoCard({
      metaLines: [`ARCHIVE · ${n} FRAME${n === 1 ? '' : 'S'}`, 'BATHONG.AFRICA/ARCHIVE'],
      photo,
    })
  })
  return buf
})
