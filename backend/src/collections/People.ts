import type { CollectionConfig } from 'payload'
import { anyone, hasEditorRole, isAdmin, isEditor } from '../access'

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
    {
      name: 'memberNumber',
      type: 'number',
      unique: true,
      admin: { description: 'The member register number, rendered as № 0001. Real numbers only.' },
    },
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
      name: 'contactEmail',
      type: 'email',
      access: {
        // Public read only when the photographer opted in; editors always.
        read: ({ req: { user }, doc }) => hasEditorRole(user) || Boolean(doc?.showContact),
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
      admin: { description: 'Manual sort order on the People page (lowest first).' },
    },
  ],
}
