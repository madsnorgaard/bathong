import { describe, expect, it, vi } from 'vitest'
import type { Access, FieldAccess, Payload } from 'payload'
import { isEditorOrOwnerField } from '../src/access'
import { canManageMedia, canReadMedia, enteredAmong, entryMediaOf, uploadedThemselves } from '../src/access/media'

/**
 * The access rules for photographs, against a small in-memory stand-in for
 * the two collections they ask about. The constraint an access function
 * returns is applied to each file here the way the database would apply it,
 * so every case reads as who may do what to which file.
 */

type Id = number | string
type Media = { id: number; visibility: 'public' | 'restricted'; uploadedBy?: number | null }
type Submission = { id: number; submitter?: number | null; images: Id[] | { id: number }[] }
type Clause = Record<string, unknown>

const ENTRANT = { id: 7, roles: ['member'] }
const OTHER = { id: 8, roles: ['member'] }
const EDITOR = { id: 2, roles: ['editor'] }
const ADMIN = { id: 1, roles: ['admin'] }

/** equals / in / not_in / and / or, which is all these rules use. */
const matches = (where: Clause, doc: Record<string, unknown>): boolean =>
  Object.entries(where).every(([key, rule]) => {
    if (key === 'and') return (rule as Clause[]).every((w) => matches(w, doc))
    if (key === 'or') return (rule as Clause[]).some((w) => matches(w, doc))
    const value = doc[key]
    const has = (list: unknown) =>
      (Array.isArray(value) ? value : [value]).some((v) => (list as Id[]).map(String).includes(String(v)))
    return Object.entries(rule as Clause).every(([op, expected]) => {
      if (op === 'equals') return value != null && String(value) === String(expected)
      if (op === 'in') return has(expected)
      if (op === 'not_in') return !has(expected)
      throw new Error(`operator ${op} is not modelled`)
    })
  })

const world = (media: Media[], submissions: Submission[]) => {
  const flat = submissions.map((s) => ({
    ...s,
    images: s.images.map((image) => (typeof image === 'object' ? image.id : image)),
  }))
  const find = vi.fn(async ({ collection, where }: { collection: string; where: Clause }) => {
    if (collection === 'media') return { docs: media.filter((m) => matches(where, m)).map(({ id }) => ({ id })) }
    const found = flat.filter((s) => matches(where, s)).map((s) => s.id)
    return { docs: submissions.filter((s) => found.includes(s.id)).map(({ id, images }) => ({ id, images })) }
  })
  const count = vi.fn(async ({ where }: { collection: string; where: Clause }) => ({
    totalDocs: media.filter((m) => matches(where, m)).length,
  }))
  return { payload: { find, count } as unknown as Payload, find, count, media }
}

const ask = async (access: Access, payload: Payload, user: unknown) =>
  access({ req: { payload, user } } as unknown as Parameters<Access>[0])

/** The ids a rule lets through, or 'all' / 'none' for a flat answer. */
const allowed = async (access: Access, w: ReturnType<typeof world>, user: unknown) => {
  const result = await ask(access, w.payload, user)
  if (result === true) return 'all'
  if (result === false) return 'none'
  return w.media.filter((m) => matches(result as Clause, m)).map((m) => m.id)
}

// 1 a public frame, 2 the entrant's entry frame from the entry endpoint (no
// uploader), 3 another member's entry frame, 4 an anonymous entry frame,
// 5 the entrant's public portrait, 6 a restricted upload of theirs that no
// entry carries, 7 a frame they uploaded and then entered through the
// collection, 8 the same kind of frame in an entry that came back as objects.
const fixture = () =>
  world(
    [
      { id: 1, visibility: 'public', uploadedBy: EDITOR.id },
      { id: 2, visibility: 'restricted' },
      { id: 3, visibility: 'restricted' },
      { id: 4, visibility: 'restricted' },
      { id: 5, visibility: 'public', uploadedBy: ENTRANT.id },
      { id: 6, visibility: 'restricted', uploadedBy: ENTRANT.id },
      { id: 7, visibility: 'restricted', uploadedBy: ENTRANT.id },
      { id: 8, visibility: 'restricted', uploadedBy: ENTRANT.id },
    ],
    [
      { id: 100, submitter: ENTRANT.id, images: [2, 7] },
      { id: 101, submitter: OTHER.id, images: [3] },
      { id: 102, submitter: null, images: [4] },
      { id: 103, submitter: ENTRANT.id, images: [{ id: 8 }] },
    ],
  )

describe('canReadMedia', () => {
  it('lets editors and admins read everything without a lookup', async () => {
    const w = fixture()
    expect(await allowed(canReadMedia, w, EDITOR)).toBe('all')
    expect(await allowed(canReadMedia, w, ADMIN)).toBe('all')
    expect(w.find).not.toHaveBeenCalled()
  })

  it('shows an anonymous visitor public files only, without a lookup', async () => {
    const w = fixture()
    expect(await ask(canReadMedia, w.payload, null)).toEqual({ visibility: { equals: 'public' } })
    expect(await allowed(canReadMedia, w, null)).toEqual([1, 5])
    expect(w.find).not.toHaveBeenCalled()
  })

  it('shows the entrant the frames of their own entries, their uploads and public files', async () => {
    const w = fixture()
    expect(await allowed(canReadMedia, w, ENTRANT)).toEqual([1, 2, 5, 6, 7, 8])
  })

  it('refuses the entrant the frames of another member and of an anonymous entry', async () => {
    const w = fixture()
    const theirs = await allowed(canReadMedia, w, ENTRANT)
    expect(theirs).not.toContain(3)
    expect(theirs).not.toContain(4)
  })

  it('refuses another member the entrant\'s frames and restricted uploads', async () => {
    const w = fixture()
    expect(await allowed(canReadMedia, w, OTHER)).toEqual([1, 3, 5])
  })

  it('keeps the old constraint for a member who has entered nothing', async () => {
    const w = fixture()
    expect(await ask(canReadMedia, w.payload, { id: 9, roles: ['member'] })).toEqual({
      or: [{ visibility: { equals: 'public' } }, { uploadedBy: { equals: 9 } }],
    })
  })

  it('looks the entries up by submitter, past access control and without the request', async () => {
    const w = fixture()
    await ask(canReadMedia, w.payload, ENTRANT)
    expect(w.find).toHaveBeenCalledTimes(1)
    expect(w.find).toHaveBeenCalledWith({
      collection: 'submissions',
      where: { submitter: { equals: ENTRANT.id } },
      select: { images: true },
      depth: 0,
      pagination: false,
      overrideAccess: true,
    })
  })

  it('fails closed: a failed lookup refuses the read instead of widening it', async () => {
    const find = vi.fn().mockRejectedValue(new Error('database gone'))
    await expect(ask(canReadMedia, { find } as unknown as Payload, ENTRANT)).rejects.toThrow('database gone')
  })
})

describe('canManageMedia (update and delete)', () => {
  it('refuses an anonymous visitor outright', async () => {
    const w = fixture()
    expect(await ask(canManageMedia, w.payload, null)).toBe(false)
    expect(await ask(canManageMedia, w.payload, undefined)).toBe(false)
    expect(w.find).not.toHaveBeenCalled()
  })

  it('lets editors and admins manage everything', async () => {
    const w = fixture()
    expect(await allowed(canManageMedia, w, EDITOR)).toBe('all')
    expect(await allowed(canManageMedia, w, ADMIN)).toBe('all')
  })

  it('leaves the entrant only their restricted upload that no entry carries', async () => {
    const w = fixture()
    expect(await allowed(canManageMedia, w, ENTRANT)).toEqual([6])
  })

  it('refuses the entrant every entry frame: the endpoint\'s and the ones they uploaded', async () => {
    const w = fixture()
    const theirs = await allowed(canManageMedia, w, ENTRANT)
    for (const frame of [2, 7, 8]) expect(theirs).not.toContain(frame)
    expect(await ask(canManageMedia, w.payload, ENTRANT)).toEqual({
      and: [
        { uploadedBy: { equals: ENTRANT.id } },
        { visibility: { equals: 'restricted' } },
        { id: { not_in: [7, 8] } },
      ],
    })
  })

  it('refuses the entrant their public portrait and anyone else\'s file', async () => {
    const w = fixture()
    const theirs = await allowed(canManageMedia, w, ENTRANT)
    for (const file of [1, 3, 4, 5]) expect(theirs).not.toContain(file)
  })

  it('refuses another member all of it', async () => {
    const w = fixture()
    expect(await allowed(canManageMedia, w, OTHER)).toEqual([])
  })

  it('holds for an entry somebody else submitted with the member\'s upload', async () => {
    const w = world(
      [{ id: 6, visibility: 'restricted', uploadedBy: ENTRANT.id }],
      [{ id: 100, submitter: EDITOR.id, images: [6] }],
    )
    expect(await allowed(canManageMedia, w, ENTRANT)).toEqual([])
  })

  it('keeps the old constraint when no entry carries the member\'s uploads', async () => {
    const w = world([{ id: 6, visibility: 'restricted', uploadedBy: ENTRANT.id }], [])
    expect(await ask(canManageMedia, w.payload, ENTRANT)).toEqual({
      and: [{ uploadedBy: { equals: ENTRANT.id } }, { visibility: { equals: 'restricted' } }],
    })
    // and with no restricted upload at all there is nothing to look up
    const empty = world([], [])
    await ask(canManageMedia, empty.payload, ENTRANT)
    expect(empty.find).toHaveBeenCalledTimes(1)
  })

  it('fails closed when a lookup fails', async () => {
    const find = vi.fn().mockRejectedValue(new Error('database gone'))
    await expect(ask(canManageMedia, { find } as unknown as Payload, ENTRANT)).rejects.toThrow('database gone')
  })
})

describe('entry lookups', () => {
  it('entryMediaOf gathers frames across entries, ids or populated', async () => {
    const w = fixture()
    expect(await entryMediaOf(w.payload, ENTRANT.id)).toEqual([2, 7, 8])
    expect(await entryMediaOf(w.payload, 9)).toEqual([])
  })

  it('enteredAmong answers only about the ids it was asked', async () => {
    const w = fixture()
    expect(await enteredAmong(w.payload, [6, 7])).toEqual([7])
    expect(await enteredAmong(w.payload, [])).toEqual([])
    expect(w.find).toHaveBeenCalledTimes(1)
  })
})

describe('uploadedThemselves (what a member may attach to an entry)', () => {
  it('passes when every file is the member\'s upload, repeats and string ids included', async () => {
    const w = fixture()
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [6, 7])).toBe(true)
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [6, '6', 6])).toBe(true)
  })

  it('refuses a public frame by someone else, another entry\'s frame and an unknown id', async () => {
    const w = fixture()
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [6, 1])).toBe(false)
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [3])).toBe(false)
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [2])).toBe(false)
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [999])).toBe(false)
  })

  it('has nothing to check for an empty list', async () => {
    const w = fixture()
    expect(await uploadedThemselves(w.payload, ENTRANT.id, [])).toBe(true)
    expect(w.count).not.toHaveBeenCalled()
  })
})

describe('isEditorOrOwnerField (people.owner)', () => {
  const read = isEditorOrOwnerField('owner')
  const can = (user: unknown, doc?: Record<string, unknown>) =>
    read({ req: { user }, doc } as unknown as Parameters<FieldAccess>[0])

  it('lets editors and admins read it, with or without a document', () => {
    expect(can(EDITOR)).toBe(true)
    expect(can(ADMIN)).toBe(true)
    expect(can(EDITOR, { owner: ENTRANT.id })).toBe(true)
  })

  it('lets the owner read it on their own profile', () => {
    expect(can(ENTRANT, { owner: ENTRANT.id })).toBe(true)
    expect(can(ENTRANT, { owner: String(ENTRANT.id) })).toBe(true)
    expect(can(ENTRANT, { owner: { id: ENTRANT.id } })).toBe(true)
  })

  it('refuses an anonymous visitor', () => {
    expect(can(null, { owner: ENTRANT.id })).toBe(false)
    expect(can(undefined, { owner: ENTRANT.id })).toBe(false)
    expect(can(null, { owner: null })).toBe(false)
  })

  it('refuses another member, and a profile nobody owns', () => {
    expect(can(OTHER, { owner: ENTRANT.id })).toBe(false)
    expect(can(OTHER, { owner: null })).toBe(false)
    expect(can(OTHER, {})).toBe(false)
  })

  it('refuses a member with no document: no filtering or sorting by owner', () => {
    expect(can(ENTRANT)).toBe(false)
    expect(can(null)).toBe(false)
  })
})
