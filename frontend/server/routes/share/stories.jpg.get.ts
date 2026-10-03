import type { FrameLike } from '../../utils/shareCards'

/**
 * The /stories card: the newest essay's lead frame on the C1 structure, the
 * bar counting the essays. No published essay serves the C1 default.
 */
export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `stories:${version}`, async () => {
    const list = await cmsGet<{
      docs: Array<{ leadFrame?: FrameLike | number | null }>
      totalDocs: number
    }>('/api/essays?sort=-publishedDate&limit=1&depth=2')
    const photo = framePhoto(list.docs[0]?.leadFrame)
    if (!photo) return null
    const n = list.totalDocs
    return photoCard({
      metaLines: [`STORIES · ${n} ESSAY${n === 1 ? '' : 'S'}`, 'BATHONG.AFRICA/STORIES'],
      photo,
    })
  })
  return buf
})
