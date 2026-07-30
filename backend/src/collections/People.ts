import type { CollectionConfig } from 'payload'
import { anyone, isAdmin, isEditor } from '../access'

export const People: CollectionConfig = {
  slug: 'people',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'roleTitle', 'foundingCircle', 'order'],
    group: 'Collective',
  },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isAdmin },
  defaultSort: 'order',
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'portrait', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'richText' },
    { name: 'roleTitle', type: 'text' },
    {
      name: 'foundingCircle',
      type: 'checkbox',
      defaultValue: false,
      admin: { description: 'Part of the founding circle of the collective.' },
    },
    { name: 'instagram', type: 'text' },
    { name: 'website', type: 'text' },
    {
      name: 'order',
      type: 'number',
      admin: { description: 'Manual sort order on the People page (lowest first).' },
    },
  ],
}
