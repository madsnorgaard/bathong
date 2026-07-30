import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'

export const Manifesto: GlobalConfig = {
  slug: 'manifesto',
  admin: { group: 'Collective' },
  versions: { drafts: true },
  // Public reads serve the published version; drafts stay in the admin.
  access: { read: anyone, update: isEditor },
  fields: [
    { name: 'headword', type: 'text', defaultValue: 'ba·thong' },
    {
      name: 'senses',
      type: 'array',
      admin: { description: 'The dictionary-style senses under the headword.' },
      fields: [{ name: 'text', type: 'text' }],
    },
    { name: 'body', type: 'richText' },
    { name: 'lineage', type: 'textarea' },
  ],
}
