import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { sql } from '@payloadcms/db-postgres'
import { anyone, hasEditorRole, isAdmin, isEditor, isEditorField } from '../access'
import { instagramUrl, webLinkProblem } from '../lib/links'
import { BIO_MAX, lexicalLength } from '../lib/lexical'

const webLink = (value: unknown) => webLinkProblem(value) ?? true

const rel = (v: unknown): number | null =>
  typeof v === 'number' ? v : v && typeof v === 'object' && 'id' in v ? (v as { id: number }).id : null

/**
 * Public profiles. A member edits their own (portrait, bio, city, links,
 * contact preference, the roster switch) through `owner`; the editorial
 * fields (name, slug, number, role, founding circle, order) stay with
 * editors. Read stays public: frames need the photographer for the credit.
 */
export const People: CollectionConfig = {
  slug: 'people',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'memberNumber', 'onRoster', 'roleTitle', 'foundingCircle', 'order'],
    group: 'Collective',
  },
  access: {
    read: anyone,
    create: isEditor,
    update: ({ req: { user } }) => {
      if (!user) return false
      if (hasEditorRole(user)) return true
      return { owner: { equals: user.id } }
    },
    delete: isAdmin,
  },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true, access: { update: isEditorField } },
    { name: 'slug', type: 'text', unique: true, index: true, access: { update: isEditorField } },
    {
      name: 'memberNumber',
      type: 'number',
      unique: true,
      access: { update: isEditorField },
      admin: {
        description:
          'The member register number, rendered as № 0001. Assigned on activation from a sequence; a number typed by hand moves the sequence past it, so numbers are never reused.',
      },
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'users',
      unique: true,
      index: true,
      // never populate: profiles are public, accounts are not
      maxDepth: 0,
      access: { update: isEditorField },
      admin: { description: 'The account that edits this profile. Set on activation; editors can link by hand.' },
    },
    {
      name: 'onRoster',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Appears on the public roster. A member needs a portrait first; editors can list a founder while the portrait is on its way.',
      },
    },
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'richText' },
    { name: 'roleTitle', type: 'text', access: { update: isEditorField } },
    {
      name: 'basedIn',
      type: 'text',
      maxLength: 80,
      admin: {
        description:
          'City, as the photographer wants it shown (Pretoria, Cape Town...). Optional; the site claims no city when empty.',
      },
    },
    {
      name: 'foundingCircle',
      type: 'checkbox',
      defaultValue: false,
      access: { update: isEditorField },
      admin: { description: 'Part of the founding circle of the collective.' },
    },
    // Rendered as plain hrefs on the public page: parsed http(s) links only.
    {
      name: 'instagram',
      type: 'text',
      validate: webLink,
      admin: { description: 'The profile link, or just the handle.' },
    },
    { name: 'website', type: 'text', validate: webLink, admin: { description: 'A full link, starting with https://' } },
    {
      name: 'contactEmail',
      type: 'email',
      access: {
        // Public read only when the photographer opted in; editors always;
        // the owner always (a value they cannot read back would be lost on
        // their next save).
        read: ({ req: { user }, doc }) =>
          hasEditorRole(user) || Boolean(doc?.showContact) || (Boolean(user) && rel(doc?.owner) === user?.id),
      },
      admin: { description: 'Shown on the public page only when "Show contact" is on.' },
    },
    {
      name: 'showContact',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Photographer choice: show their own contact on the site. Off means enquiries route to the collective address.',
      },
    },
    {
      name: 'order',
      type: 'number',
      access: { update: isEditorField },
      admin: { description: 'Manual sort order on the People page (lowest first).' },
    },
  ],
  hooks: {
    beforeValidate: [
      // A handle typed in the Instagram field becomes the profile link.
      ({ data }) => {
        if (typeof data?.instagram === 'string' && data.instagram.trim()) data.instagram = instagramUrl(data.instagram)
        return data
      },
      // A member's portrait is a file they uploaded themselves, never
      // someone else's frame picked by id.
      async ({ data, originalDoc, req }) => {
        if (!req.user || hasEditorRole(req.user)) return data
        if (!data || !('portrait' in data) || data.portrait == null) return data
        const next = rel(data.portrait)
        if (next === rel(originalDoc?.portrait)) return data
        const refuse = () => new APIError('Use a portrait you uploaded yourself.', 400)
        if (!Number.isInteger(next)) throw refuse()
        const media = await req.payload.findByID({
          collection: 'media',
          id: next as number,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
          req,
        })
        if (!media || rel(media.uploadedBy) !== req.user.id || media.visibility !== 'public') throw refuse()
        return data
      },
      // The bio is a few lines, not an essay: the page caps it, the API holds it.
      ({ data }) => {
        if (data?.bio && lexicalLength(data.bio) > BIO_MAX) {
          throw new APIError(`Keep the bio under ${BIO_MAX} characters.`, 400)
        }
        return data
      },
      // The roster needs a face. The rule is for members editing their own
      // page; an editor (or the seed, with no user) may list a founder
      // before the portrait arrives. An explicit null counts as no portrait.
      ({ data, originalDoc, req }) => {
        if (!req.user || hasEditorRole(req.user)) return data
        const on = data && 'onRoster' in data ? data.onRoster : originalDoc?.onRoster
        const portrait = data && 'portrait' in data ? data.portrait : originalDoc?.portrait
        if (on && !portrait) throw new APIError('Add a portrait before joining the roster.', 400)
        return data
      },
      // A number typed by hand moves the sequence past it.
      async ({ data, originalDoc, req, context }) => {
        if (context?.assigningNumber) return data
        const n = data?.memberNumber
        if (typeof n === 'number' && n !== originalDoc?.memberNumber) {
          await req.payload.db.drizzle.execute(
            sql`SELECT setval('people_member_number_seq', GREATEST((SELECT last_value FROM people_member_number_seq), ${Math.trunc(n)}::bigint))`,
          )
        }
        return data
      },
    ],
    afterChange: [
      // A replaced portrait does not linger as a public orphan: when the
      // old file was the owner's own upload and nothing else shows it, it
      // goes. (Members cannot delete public media themselves.)
      async ({ doc, previousDoc, req }) => {
        const before = rel(previousDoc?.portrait)
        const owner = rel(doc.owner)
        if (!before || before === rel(doc.portrait) || !owner) return
        const { payload } = req
        const old = await payload.findByID({
          collection: 'media',
          id: before,
          depth: 0,
          overrideAccess: true,
          disableErrors: true,
          req,
        })
        if (!old || rel(old.uploadedBy) !== owner) return
        const [frames, people] = await Promise.all([
          payload.count({ collection: 'frames', where: { image: { equals: before } }, overrideAccess: true, req }),
          payload.count({ collection: 'people', where: { portrait: { equals: before } }, overrideAccess: true, req }),
        ])
        if (frames.totalDocs || people.totalDocs) return
        try {
          await payload.delete({ collection: 'media', id: before, overrideAccess: true, req })
        } catch (err) {
          payload.logger.warn({ err, media: before }, 'profile: old portrait not removed')
        }
      },
      // An owner linked by an editor becomes that account's profile.
      async ({ doc, previousDoc, req, context }) => {
        if (context?.syncingOwner) return
        const owner = rel(doc.owner)
        const before = rel(previousDoc?.owner)
        if (owner && owner !== before) {
          await req.payload.update({
            collection: 'users',
            id: owner,
            data: { profile: doc.id },
            overrideAccess: true,
            req,
            context: { syncingOwner: true },
          })
        }
      },
    ],
  },
}
