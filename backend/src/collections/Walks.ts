import type { CollectionConfig } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'

export const Walks: CollectionConfig = {
  slug: 'walks',
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
      // Virtual spotsTaken so EventBlock can render "X of Y places left"
      // without a second request. Walk lists are short; the count is cheap.
      async ({ doc, req }) => {
        if (typeof doc?.capacity !== 'number') return doc
        const confirmed = await req.payload.count({
          collection: 'rsvps',
          where: {
            and: [{ walk: { equals: doc.id } }, { status: { equals: 'confirmed' } }],
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
        description: 'Start of the walk. Enter times in SAST (the picker uses your local time).',
      },
    },
    {
      name: 'endTime',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'd MMM yyyy HH:mm' },
        description:
          'When the walk wraps. Until then the walk stays on the site as the current walk.',
      },
    },
    { name: 'meetingPoint', type: 'text' },
    { name: 'route', type: 'richText' },
    {
      name: 'routeGeo',
      type: 'json',
      admin: {
        description:
          'GeoJSON FeatureCollection: one LineString (the route, [lng, lat] pairs) plus optional Point features with a "name" property for landmark markers. Drives the interactive map on /walks. Workflow for producing one precisely: docs/ROUTES.md.',
      },
      validate: (value: unknown) => {
        if (value === null || value === undefined) return true
        if (typeof value !== 'object' || Array.isArray(value)) {
          return 'routeGeo must be a GeoJSON FeatureCollection object'
        }
        const features = (value as { features?: unknown }).features
        if (!Array.isArray(features)) return 'routeGeo needs a "features" array'
        const validLngLat = (c: unknown) =>
          Array.isArray(c) &&
          typeof c[0] === 'number' &&
          typeof c[1] === 'number' &&
          Math.abs(c[0]) <= 180 &&
          Math.abs(c[1]) <= 90
        const hasLine = features.some((f) => {
          const geometry = (f as { geometry?: { type?: unknown; coordinates?: unknown } })?.geometry
          return (
            geometry?.type === 'LineString' &&
            Array.isArray(geometry.coordinates) &&
            geometry.coordinates.length >= 2 &&
            geometry.coordinates.every(validLngLat)
          )
        })
        if (!hasLine) {
          return 'routeGeo needs one LineString of at least two valid [lng, lat] pairs (lng first - a [lat, lng] paste is the usual mistake)'
        }
        return true
      },
    },
    { name: 'routeMap', type: 'upload', relationTo: 'media' },
    { name: 'capacity', type: 'number' },
    { name: 'priceMember', type: 'number' },
    { name: 'priceNonMember', type: 'number' },
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
    { name: 'leader', type: 'relationship', relationTo: 'people' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    {
      // "№ 001" is the walk's place in the published programme, date order.
      // Virtual so a walk inserted with an earlier date renumbers the rest
      // instead of leaving stale numbers behind; one count per read, the
      // same price as spotsTaken.
      name: 'number',
      type: 'number',
      virtual: true,
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Position in the published programme, date order. Rendered as № 001.',
      },
      hooks: {
        afterRead: [
          async ({ data, req }) => {
            if (!data?.date) return null
            const before = await req.payload.count({
              collection: 'walks',
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
    // The reverse side of essays.walks / frames.walk / albums.walks. Joins
    // are virtual (no columns) and run the joined collection's read access,
    // so anonymous readers see published essays and albums only.
    {
      name: 'essays',
      type: 'join',
      collection: 'essays',
      on: 'walks',
      defaultSort: '-publishedDate',
      defaultLimit: 24,
      // Joined docs populate to min(maxDepth, depth) with the joined doc as
      // level one: essay -> leadFrame -> image needs three, so the walk page
      // reads at depth=3.
      maxDepth: 3,
      admin: {
        defaultColumns: ['title', 'publishedDate', '_status'],
        description: 'Essays published from this walk.',
      },
    },
    {
      name: 'frames',
      type: 'join',
      collection: 'frames',
      on: 'walk',
      defaultSort: '-createdAt',
      defaultLimit: 12,
      maxDepth: 2,
      admin: { defaultColumns: ['image', 'photographer', 'caption'] },
    },
    {
      name: 'albums',
      type: 'join',
      collection: 'albums',
      on: 'walks',
      defaultSort: '-date',
      defaultLimit: 12,
      maxDepth: 2,
      admin: { defaultColumns: ['title', 'date', '_status'] },
    },
  ],
}
