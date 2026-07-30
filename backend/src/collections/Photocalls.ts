import type { CollectionConfig } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'

export const Photocalls: CollectionConfig = {
  slug: 'photocalls',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'status', 'opensAt', 'closesAt', '_status'],
    group: 'Programme',
  },
  versions: { drafts: true },
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isAdmin },
  defaultSort: '-opensAt',
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'theme', type: 'richText' },
    { name: 'heroImage', type: 'upload', relationTo: 'media' },
    { name: 'opensAt', type: 'date' },
    { name: 'closesAt', type: 'date' },
    { name: 'maxImagesPerSubmission', type: 'number', defaultValue: 5 },
    { name: 'membersOnly', type: 'checkbox', defaultValue: false },
    {
      name: 'terms',
      type: 'richText',
      admin: {
        description:
          'The submission terms: photographers keep copyright and grant the collective a ' +
          'non-exclusive licence. This text is required in writing before a call opens.',
      },
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Open', value: 'open' },
        { label: 'Judging', value: 'judging' },
        { label: 'Closed', value: 'closed' },
      ],
    },
    {
      name: 'resultEssay',
      type: 'relationship',
      relationTo: 'essays',
      admin: { description: 'The essay published from this call, once it exists.' },
    },
  ],
}
