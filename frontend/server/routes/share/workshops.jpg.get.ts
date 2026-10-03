import { nextWorkshopsQuery, pastWorkshopsQuery } from '../../../utils/workshops'
import type { WorkshopCardDoc } from '../../utils/shareCards'

/**
 * The /workshops card. While one is upcoming: the next workshop's card
 * ("next" follows the pages' rule, a workshop stays current until it
 * wraps). Between workshops: the last one held, by its invite or a
 * photograph from it. Neither serves the C1 default.
 */
export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `workshops:${version}`, async () => {
    const now = new Date().toISOString()
    // depth 1 so the invite arrives populated
    const next = await cmsGet<{ docs: WorkshopCardDoc[] }>(nextWorkshopsQuery(now, 1))
    if (next.docs[0]) return workshopCard(next.docs[0])
    const past = await cmsGet<{ docs: WorkshopCardDoc[] }>(
      `${pastWorkshopsQuery(now, 1, 1)}&joins[albums]=false`,
    )
    return past.docs[0] ? workshopCard(past.docs[0], false) : null
  })
  return buf
})
