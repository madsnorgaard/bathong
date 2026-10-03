import type { WorkshopCardDoc } from '../../../utils/shareCards'

/**
 * Workshop card for one workshop: the invite poster beside the jacaranda
 * plate when it has one, a photograph from its albums once it is held
 * without one, the type plate otherwise. Unknown or unpublished slugs serve
 * the C1 default.
 */
export default defineEventHandler(async (event) => {
  const slug = decodeURIComponent(getRouterParam(event, 'slug') ?? '').replace(/\.jpg$/, '')
  const version = (getQuery(event).v as string) ?? ''
  const buf = await serveCard(event, `workshop:${slug}:${version}`, async () => {
    const list = await cmsGet<{ docs: WorkshopCardDoc[] }>(
      // depth 1 so the invite arrives; joins skipped per path (a bare
      // joins=false is not honoured by 3.84)
      `/api/workshops?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=1&joins[albums]=false`,
    )
    const workshop = list.docs[0]
    return workshop ? workshopCard(workshop) : null
  })
  return buf
})
