import type { Access, Payload, Where } from 'payload'
import { hasEditorRole } from './index'

type Id = number | string

const relationId = (value: unknown): Id | undefined => {
  if (value && typeof value === 'object') return (value as { id?: Id }).id
  return (value ?? undefined) as Id | undefined
}

const imagesOf = (docs: { images?: unknown }[]): Id[] =>
  docs.flatMap((doc) =>
    (Array.isArray(doc.images) ? doc.images : []).map(relationId).filter((id): id is Id => id !== undefined),
  )

// The lookups below run without `req` on purpose: an access function fires
// in the middle of other operations (every populated photograph), and a
// local call that carries the request rewrites its context and query depth.
// They only read committed rows, so they need no part in a transaction.

/** The photographs of every photocall entry this account submitted. */
export const entryMediaOf = async (payload: Payload, userId: Id): Promise<Id[]> => {
  const { docs } = await payload.find({
    collection: 'submissions',
    where: { submitter: { equals: userId } },
    select: { images: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  return imagesOf(docs)
}

/** Of these media ids, the ones a photocall entry (anyone's) carries. */
export const enteredAmong = async (payload: Payload, ids: Id[]): Promise<Id[]> => {
  if (!ids.length) return []
  const { docs } = await payload.find({
    collection: 'submissions',
    where: { images: { in: ids } },
    select: { images: true },
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const asked = new Set(ids.map(String))
  return imagesOf(docs).filter((id) => asked.has(String(id)))
}

/** True when every one of these media files was uploaded by this account. */
export const uploadedThemselves = async (payload: Payload, userId: Id, ids: Id[]): Promise<boolean> => {
  const unique = [...new Map(ids.map((id) => [String(id), id])).values()]
  if (!unique.length) return true
  const { totalDocs } = await payload.count({
    collection: 'media',
    where: { and: [{ id: { in: unique } }, { uploadedBy: { equals: userId } }] },
    overrideAccess: true,
  })
  return totalDocs === unique.length
}

/**
 * Public files are visible to everyone; restricted files (e.g. photocall
 * submissions under judging) are visible to editors, to their uploader, and
 * to the account that entered them: the frames of a submission whose
 * submitter is the reader. The entry link grants the read and nothing else;
 * see canManageMedia.
 */
export const canReadMedia: Access = async ({ req: { payload, user } }) => {
  if (hasEditorRole(user)) return true
  const isPublic: Where = { visibility: { equals: 'public' } }
  if (!user) return isPublic
  const readable: Where[] = [isPublic, { uploadedBy: { equals: user.id } }]
  const entered = await entryMediaOf(payload, user.id)
  if (entered.length) readable.push({ id: { in: entered } })
  return { or: readable }
}

/**
 * Editors manage everything. Uploaders may only touch their own files while
 * those files are still restricted - once public, a frame may be in use.
 * A file a photocall entry carries is out of reach altogether: an entry is
 * judged as it was sent, so its frames are not the entrant's to change,
 * publish or remove. The constraint covers one document and bulk calls alike.
 */
export const canManageMedia: Access = async ({ req: { payload, user } }) => {
  if (!user) return false
  if (hasEditorRole(user)) return true
  const ownWhileRestricted: Where[] = [
    { uploadedBy: { equals: user.id } },
    { visibility: { equals: 'restricted' } },
  ]
  const { docs } = await payload.find({
    collection: 'media',
    where: { and: ownWhileRestricted },
    select: {},
    depth: 0,
    pagination: false,
    overrideAccess: true,
  })
  const entered = await enteredAmong(
    payload,
    docs.map((doc) => doc.id),
  )
  if (entered.length) return { and: [...ownWhileRestricted, { id: { not_in: entered } }] }
  return { and: ownWhileRestricted }
}
