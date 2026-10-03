import { nextWalksQuery, pastWalksQuery } from '../../../utils/walks'
import type { WalkCardDoc } from '../../utils/shareCards'

/**
 * The /walks card. While a walk is upcoming: C4, the full jacaranda plate
 * with the next walk's date enormous ("next" follows the pages' rule, a
 * walk stays current until it wraps). Between walks: the photograph of the
 * last one walked. Neither serves the C1 default.
 */
export default defineEventHandler(async (event) => {
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `walks:${version}`, async () => {
    const now = new Date().toISOString()
    const next = await cmsGet<{ docs: WalkCardDoc[] }>(nextWalksQuery(now, 1))
    if (next.docs[0]) return walkCard(next.docs[0])
    const past = await cmsGet<{ docs: WalkCardDoc[] }>(
      `${pastWalksQuery(now, 1)}&joins[essays]=false&joins[albums]=false`,
    )
    return past.docs[0] ? walkCard(past.docs[0], false) : null
  })
  return buf
})
