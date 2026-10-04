import { exhibitionLead, exhibitionsQuery, orderExhibitions } from '../../../utils/exhibitions'
import type { Exhibition } from '../../../types/payload-types'

/**
 * The /exhibitions card: the photograph that leads the page (the first
 * exhibition with one, on now before coming up before the record) on the C1
 * structure, the bar naming the exhibition. No published exhibition, or none
 * with a photograph, serves the C1 default.
 */
export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `exhibitions:${version}`, async () => {
    // media whole, not trimmed: the card wants the og rendition
    const list = await cmsGet<{ docs: Exhibition[] }>(exhibitionsQuery(40, false))
    const { live, past } = orderExhibitions(list.docs)
    for (const exhibition of [...live, ...past]) {
      const lead = exhibitionLead(exhibition)
      const url = bestPhotoUrl(lead?.media)
      if (!lead || !url) continue
      return photoCard({
        metaLines: [barLine(exhibition.title), 'BATHONG.AFRICA/EXHIBITIONS'],
        photo: { credit: lead.credit, url },
      })
    }
    return null
  })
  return buf
})
