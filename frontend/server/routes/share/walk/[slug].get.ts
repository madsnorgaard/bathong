import type { WalkCardDoc } from '../../../utils/shareCards'

/**
 * C4 walk card for one walk: the jacaranda plate with the date enormous
 * while it is upcoming (with the member price), a photograph from the walk
 * once it is walked and has produced one. Unknown or unpublished slugs
 * serve the C1 default.
 */
export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `walk:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: WalkCardDoc[] }>(
      // joins are skipped per path: a bare joins=false is not honoured by 3.84
      `/api/walks?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=0&joins[essays]=false&joins[frames]=false&joins[albums]=false`,
    )
    const walk = list.docs[0]
    return walk ? walkCard(walk) : null
  })
  return buf
})
