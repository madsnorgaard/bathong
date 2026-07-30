import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'

export const Membership: GlobalConfig = {
  slug: 'membership',
  admin: { group: 'Collective' },
  versions: { drafts: true },
  // Public reads serve the published version; drafts stay in the admin.
  access: { read: anyone, update: isEditor },
  fields: [
    {
      name: 'benefits',
      type: 'array',
      fields: [
        { name: 'title', type: 'text' },
        { name: 'description', type: 'textarea' },
      ],
    },
    { name: 'priceIndividual', type: 'number' },
    { name: 'priceStudent', type: 'number' },
    { name: 'priceNote', type: 'text', defaultValue: 'Launch pricing announced soon' },
    { name: 'cardImage', type: 'upload', relationTo: 'media' },
    { name: 'joinUrl', type: 'text' },
  ],
}
