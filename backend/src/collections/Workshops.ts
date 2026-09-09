import type { CollectionConfig } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'

/**
 * Workshops are the taught side of the programme: a room, a facilitator and
 * materials, where a walk is a route and a meeting point. They book through
 * the same RSVP mechanism as walks, carry one flat price per person, and a
 * held workshop can carry snapshot galleries (albums) like a walked walk.
 * No route, no frames or essays: the archive stays walk-only for now.
 */
export const Workshops: CollectionConfig = {
  slug: 'workshops',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'bookingStatus', '_status'],
    group: 'Programme',
  },
  versions: { drafts: true },
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isAdmin },
  defaultSort: '-date',
  hooks: {
    afterRead: [
      // Virtual spotsTaken, same price as the walks one: EventBlock renders
      // "X of Y places left" without a second request.
      async ({ doc, req }) => {
        if (typeof doc?.capacity !== 'number') return doc
        const confirmed = await req.payload.count({
          collection: 'rsvps',
          where: {
            and: [{ workshop: { equals: doc.id } }, { status: { equals: 'confirmed' } }],
          },
          req,
        })
        return { ...doc, spotsTaken: confirmed.totalDocs }
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy HH:mm' },
        description:
          'Start of the workshop. Enter times in SAST (the picker uses your local time).',
      },
    },
    {
      name: 'endTime',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy HH:mm' },
        description:
          'When the workshop wraps. Until then it stays on the site as the current workshop.',
      },
    },
    {
      name: 'venueName',
      type: 'text',
      admin: { description: 'The venue itself, e.g. Botaki ba Afrika. Kept short for the share card.' },
    },
    {
      name: 'venueAddress',
      type: 'text',
      admin: { description: 'Where the venue is, e.g. Hatfield, Pretoria.' },
    },
    { name: 'description', type: 'richText' },
    {
      name: 'practicalInfo',
      type: 'array',
      admin: {
        description:
          'Short practical lines from the invite: skill levels, child friendliness, what to bring.',
      },
      fields: [{ name: 'line', type: 'text', required: true }],
    },
    { name: 'capacity', type: 'number' },
    {
      name: 'price',
      type: 'number',
      admin: { description: 'One price per person, in rand. 0 means free.' },
    },
    {
      name: 'priceIncludes',
      type: 'text',
      admin: { description: 'What the price covers, e.g. All materials included.' },
    },
    { name: 'bookingUrl', type: 'text' },
    {
      name: 'bookingStatus',
      type: 'select',
      defaultValue: 'open',
      options: [
        { label: 'Open', value: 'open' },
        { label: 'Full', value: 'full' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    {
      name: 'facilitators',
      type: 'relationship',
      relationTo: 'people',
      hasMany: true,
      admin: {
        description: 'The member(s) running this workshop, in billing order.',
      },
    },
    {
      name: 'contact',
      type: 'relationship',
      relationTo: 'people',
      admin: { description: 'Who answers questions about this workshop.' },
    },
    {
      // A workshop can be co-run by more than one organisation; each one
      // is named, optionally linked, and its logo shows on the paper ground.
      name: 'partners',
      type: 'array',
      admin: { description: 'Partner organisations hosting or co-running the workshop.' },
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'url', type: 'text' },
        { name: 'logo', type: 'upload', relationTo: 'media' },
      ],
    },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    {
      // "№ 001" in the workshop programme, its own series, date order. The
      // same virtual-count approach as the walks number so an inserted
      // workshop renumbers the rest instead of leaving stale numbers behind.
      name: 'number',
      type: 'number',
      virtual: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Position in the published workshop programme, date order. Rendered as № 001.',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            // Only the published programme is numbered; a draft has no place
            // in it yet (and would otherwise borrow its predecessor's number).
            if (!data?.date || data._status !== 'published') return null
            const before = await req.payload.count({
              collection: 'workshops',
              where: {
                and: [
                  { _status: { equals: 'published' } },
                  {
                    or: [
                      { date: { less_than: data.date } },
                      {
                        and: [
                          { date: { equals: data.date } },
                          { id: { less_than_equal: data.id } },
                        ],
                      },
                    ],
                  },
                ],
              },
              req,
            })
            return before.totalDocs || 1
          },
        ],
      },
    },
    {
      // The reverse side of albums.workshops. Joins are virtual (no columns)
      // and run the albums read access, so anonymous readers see published
      // albums only.
      name: 'albums',
      type: 'join',
      collection: 'albums',
      on: 'workshops',
      defaultSort: '-date',
      defaultLimit: 12,
      maxDepth: 2,
      admin: { defaultColumns: ['title', 'date', '_status'] },
    },
  ],
}
