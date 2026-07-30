import type { CollectionConfig } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'

export const Exhibitions: CollectionConfig = {
  slug: 'exhibitions',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'venue', 'startDate', 'status', '_status'],
    group: 'Programme',
  },
  versions: { drafts: true },
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isAdmin },
  defaultSort: '-startDate',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'venue', type: 'text' },
    { name: 'startDate', type: 'date' },
    { name: 'endDate', type: 'date' },
    { name: 'description', type: 'richText' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'frames', type: 'relationship', relationTo: 'frames', hasMany: true },
    { name: 'relatedEssays', type: 'relationship', relationTo: 'essays', hasMany: true },
    { name: 'partners', type: 'text' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Upcoming', value: 'upcoming' },
        { label: 'Current', value: 'current' },
        { label: 'Past', value: 'past' },
      ],
    },
  ],
}
