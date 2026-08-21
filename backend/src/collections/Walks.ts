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
      name: 'resultEssay',
      type: 'relationship',
      relationTo: 'essays',
      admin: { description: 'The essay published from this walk, once it exists.' },
    },
  ],
}
