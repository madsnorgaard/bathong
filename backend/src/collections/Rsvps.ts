import { APIError, type CollectionConfig } from 'payload'
import { anyone, hasEditorRole, isAdmin, isEditor } from '../access'
import { getContactEmail, sendSafe } from '../email/send'
import { editorNewRsvp, rsvpConfirmed, rsvpPromoted, rsvpWaitlisted } from '../email/templates'

/**
 * Event RSVPs: one row reserves a place on exactly one walk or one workshop.
 * Public create so a first-time visitor can reserve a place without an
 * account; read/update stay editorial (the list is personal data, POPIA
 * applies). Capacity is enforced in beforeChange with a count query - a
 * simultaneous pair of submits can in theory both pass the check, which is
 * accepted at collective scale (an event over by one is a good problem).
 * afterChange sends the confirmation/waitlist email (fire-and-forget - a
 * dead SMTP hop must never fail a committed RSVP).
 */

type EventKind = {
  collection: 'walks' | 'workshops'
  field: 'walk' | 'workshop'
  noun: 'walk' | 'workshop'
}

const WALK: EventKind = { collection: 'walks', field: 'walk', noun: 'walk' }
const WORKSHOP: EventKind = { collection: 'workshops', field: 'workshop', noun: 'workshop' }

const eventId = (value: unknown): number | string | null | undefined =>
  typeof value === 'object' && value !== null
    ? (value as { id?: number | string }).id
    : (value as number | string | null | undefined)

export const Rsvps: CollectionConfig = {
  slug: 'rsvps',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['walk', 'workshop', 'name', 'email', 'status', 'createdAt'],
    group: 'Programme',
  },
  access: {
    // A signed-in member sees their own RSVPs on their desk; the list stays editorial.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (hasEditorRole(user)) return true
      return { user: { equals: user.id } }
    },
    create: anyone,
    update: isEditor,
    delete: isAdmin,
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'walk', type: 'relationship', relationTo: 'walks', index: true },
    { name: 'workshop', type: 'relationship', relationTo: 'workshops', index: true },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      // never populate: the account (sessions and all) has no business in an RSVP response
      maxDepth: 0,
      admin: { readOnly: true, description: 'Set when a signed-in member reserves.' },
    },
    { name: 'name', type: 'text', required: true },
    { name: 'email', type: 'email', required: true },
    { name: 'note', type: 'textarea' },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'confirmed',
      options: [
        { label: 'Confirmed', value: 'confirmed' },
        { label: 'Waitlist', value: 'waitlist' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
      access: { update: ({ req: { user } }) => Boolean(user) },
    },
    {
      // Honeypot: hidden in the form; bots that fill it are rejected.
      name: 'website',
      type: 'text',
      admin: { hidden: true },
      access: { read: () => false },
    },
  ],
  hooks: {
    beforeValidate: [
      // An RSVP always names exactly one event, on create and on edit alike:
      // an editor moving a booking must not leave a row with both or neither.
      async ({ data, originalDoc }) => {
        const walk = data && 'walk' in data ? data.walk : originalDoc?.walk
        const workshop = data && 'workshop' in data ? data.workshop : originalDoc?.workshop
        if (Boolean(eventId(walk)) === Boolean(eventId(workshop))) {
          throw new APIError('An RSVP needs exactly one walk or workshop.', 400)
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        if (data.website) {
          throw new APIError('Could not process this RSVP.', 400)
        }
        // The account, never the form, says who reserved.
        data.user = req.user?.id ?? null

        const kind = data.workshop ? WORKSHOP : WALK
        const id = eventId(data[kind.field])
        const event = await req.payload.findByID({
          collection: kind.collection,
          id: id as number | string,
          depth: 0,
          req,
        })
        if (!event || event._status !== 'published') {
          throw new APIError(`This ${kind.noun} is not open for RSVPs.`, 400)
        }
        if (event.bookingStatus === 'closed') {
          throw new APIError(`Bookings for this ${kind.noun} have closed.`, 400)
        }
        if (event.bookingUrl) {
          throw new APIError(`This ${kind.noun} takes bookings through its booking link.`, 400)
        }

        const duplicate = await req.payload.count({
          collection: 'rsvps',
          where: {
            and: [
              { [kind.field]: { equals: id } },
              { email: { equals: data.email } },
              { status: { not_equals: 'cancelled' } },
            ],
          },
          req,
        })
        if (duplicate.totalDocs > 0) {
          throw new APIError(`This email already has a place on this ${kind.noun}.`, 400)
        }

        if (event.bookingStatus === 'full') {
          return { ...data, status: 'waitlist' }
        }
        if (typeof event.capacity === 'number') {
          const confirmed = await req.payload.count({
            collection: 'rsvps',
            where: {
              and: [{ [kind.field]: { equals: id } }, { status: { equals: 'confirmed' } }],
            },
            req,
          })
          if (confirmed.totalDocs >= event.capacity) {
            return { ...data, status: 'waitlist' }
          }
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, previousDoc, req, operation, context }) => {
        if (context?.skipEmails) return

        const promoted =
          operation === 'update' &&
          previousDoc?.status === 'waitlist' &&
          doc.status === 'confirmed'
        if (operation !== 'create' && !promoted) return

        // The event existed moments ago in beforeChange, so a failure here is
        // transient - skipping the email beats failing the committed RSVP.
        const kind = doc.workshop ? WORKSHOP : WALK
        let event
        try {
          const id = eventId(doc[kind.field])
          event = await req.payload.findByID({
            collection: kind.collection,
            id: id as number | string,
            depth: 0,
            req,
          })
        } catch (err) {
          req.payload.logger.error(
            { err, rsvp: doc.id },
            `rsvp email skipped: ${kind.noun} fetch failed`,
          )
          return
        }

        const contactEmail = await getContactEmail(req)
        if (operation === 'create') {
          const template = doc.status === 'waitlist' ? rsvpWaitlisted : rsvpConfirmed
          sendSafe(req, { ...template(doc, event, kind.noun), to: doc.email, replyTo: contactEmail })
          sendSafe(req, {
            ...editorNewRsvp(doc, event, req.payload.config.serverURL),
            to: contactEmail,
            replyTo: doc.email,
          })
        } else {
          sendSafe(req, { ...rsvpPromoted(doc, event, kind.noun), to: doc.email, replyTo: contactEmail })
        }
      },
    ],
  },
}
