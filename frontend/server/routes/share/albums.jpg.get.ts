import { latestAlbumsQuery } from '../../../utils/albums'
import type { AlbumLike } from '../../utils/shareCards'

/**
 * The /albums card: the newest album's first photograph on the C1 structure,
 * the bar counting the shelf. No published album serves the C1 default.
 */
export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `albums:${version}`, async () => {
    const list = await cmsGet<{ docs: AlbumLike[]; totalDocs: number }>(latestAlbumsQuery(1))
    const photo = albumPhoto(list.docs[0])
    if (!photo) return null
    const n = list.totalDocs
    return photoCard({
      metaLines: [`ALBUMS · ${n} PUBLISHED`, 'BATHONG.AFRICA/ALBUMS'],
      photo,
    })
  })
  return buf
})
