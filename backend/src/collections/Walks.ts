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
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'date', type: 'date', required: true },
    { name: 'endTime', type: 'date' },
    { name: 'meetingPoint', type: 'text' },
    { name: 'route', type: 'richText' },
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
