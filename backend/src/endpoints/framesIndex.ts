import type { Endpoint, PayloadRequest } from 'payload'
import { hasEditorRole } from '../access'
import type { Frame, Media, Person } from '../payload-types'

/**
 * GET /api/frames-index - a flat, thumbnail-ready index of every Frame for
 * the admin sequence editor. One request instead of a depth-2 relationship
 * query per tile; stays cheap as the archive grows.
 *
 * Editor-gated: this powers an editorial surface and exposes restricted
 * media thumbnails, so members and anonymous callers get a 403.
 */
export const framesIndex: Endpoint = {
  path: '/frames-index',
  method: 'get',
  handler: async (req: PayloadRequest) => {
    if (!hasEditorRole(req.user)) {
      return Response.json({ errors: [{ message: 'Editors only.' }] }, { status: 403 })
    }

    const { docs } = await req.payload.find({
      collection: 'frames',
      depth: 1,
      pagination: false,
      sort: '-createdAt',
      overrideAccess: true,
    })

    const frames = (docs as Frame[]).map((frame) => {
      const image = typeof frame.image === 'object' ? (frame.image as Media | null) : null
      const photographer =
        typeof frame.photographer === 'object' ? (frame.photographer as Person | null) : null
      return {
        id: frame.id,
        caption: frame.caption ?? null,
        location: frame.location ?? null,
        thumb: image?.sizes?.card?.url ?? image?.url ?? null,
        full: image?.sizes?.hero?.url ?? image?.url ?? null,
        width: image?.width ?? null,
        height: image?.height ?? null,
        alt: image?.alt ?? null,
        photographerId: photographer?.id ?? null,
        photographerName: photographer?.name ?? null,
        credit: frame.creditOverride ?? photographer?.name ?? null,
      }
    })

    return Response.json({ frames })
  },
}
