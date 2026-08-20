import { APIError, type CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditor } from '../access'
import { getContactEmail, sendSafe } from '../email/send'
import { editorNewRsvp, rsvpConfirmed, rsvpPromoted, rsvpWaitlisted } from '../email/templates'

/**
 * Walk RSVPs. Public create so a first-time visitor can reserve a place
 * without an account; read/update stay editorial (the list is personal data,
 * POPIA applies). Capacity is enforced in beforeChange with a count query -
 * a simultaneous pair of submits can in theory both pass the check, which is
 * accepted at collective scale (a walk over by one is a good problem).
 * afterChange sends the confirmation/waitlist email (fire-and-forget - a
 * dead SMTP hop must never fail a committed RSVP).
 */
export const Rsvps: CollectionConfig = {
  slug: 'rsvps',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['walk', 'name', 'email', 'status', 'createdAt'],
    group: 'Programme',
  },
  access: { read: isEditor, create: anyone, update: isEditor, delete: isAdmin },
  defaultSort: '-createdAt',
  fields: [
    { name: 'walk', type: 'relationship', relationTo: 'walks', required: true, index: true },
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
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation !== 'create') return data

        if (data.website) {
          throw new APIError('Could not process this RSVP.', 400)
        }

        const walkId = typeof data.walk === 'object' ? data.walk?.id : data.walk
        const walk = await req.payload.findByID({
          collection: 'walks',
          id: walkId,
          depth: 0,
          req,
        })
        if (!walk || walk._status !== 'published') {
          throw new APIError('This walk is not open for RSVPs.', 400)
        }
        if (walk.bookingStatus === 'closed') {
          throw new APIError('Bookings for this walk have closed.', 400)
        }
        if (walk.bookingUrl) {
          throw new APIError('This walk takes bookings through its booking link.', 400)
        }

        const duplicate = await req.payload.count({
          collection: 'rsvps',
          where: {
            and: [
              { walk: { equals: walkId } },
              { email: { equals: data.email } },
              { status: { not_equals: 'cancelled' } },
            ],
          },
          req,
        })
        if (duplicate.totalDocs > 0) {
          throw new APIError('This email already has a place on this walk.', 400)
        }

        if (walk.bookingStatus === 'full') {
          return { ...data, status: 'waitlist' }
        }
        if (typeof walk.capacity === 'number') {
          const confirmed = await req.payload.count({
            collection: 'rsvps',
            where: {
              and: [{ walk: { equals: walkId } }, { status: { equals: 'confirmed' } }],
            },
            req,
          })
          if (confirmed.totalDocs >= walk.capacity) {
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

        // The walk existed moments ago in beforeChange, so a failure here is
        // transient - skipping the email beats failing the committed RSVP.
        let walk
        try {
          const walkId = typeof doc.walk === 'object' ? doc.walk?.id : doc.walk
          walk = await req.payload.findByID({ collection: 'walks', id: walkId, depth: 0, req })
        } catch (err) {
          req.payload.logger.error({ err, rsvp: doc.id }, 'rsvp email skipped: walk fetch failed')
          return
        }

        const contactEmail = await getContactEmail(req)
        if (operation === 'create') {
          const template = doc.status === 'waitlist' ? rsvpWaitlisted : rsvpConfirmed
          sendSafe(req, { ...template(doc, walk), to: doc.email, replyTo: contactEmail })
          sendSafe(req, {
            ...editorNewRsvp(doc, walk, req.payload.config.serverURL),
            to: contactEmail,
            replyTo: doc.email,
          })
        } else {
          sendSafe(req, { ...rsvpPromoted(doc, walk), to: doc.email, replyTo: contactEmail })
        }
      },
    ],
  },
}
