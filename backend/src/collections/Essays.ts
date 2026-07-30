import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'

export const Essays: CollectionConfig = {
  slug: 'essays',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedDate', '_status'],
    group: 'Work',
  },
  versions: { drafts: true, maxPerDoc: 25 },
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'deck', type: 'textarea', admin: { description: 'Short standfirst under the title.' } },
    { name: 'body', type: 'richText' },
    { name: 'leadFrame', type: 'relationship', relationTo: 'frames' },
    {
      name: 'sequence',
      type: 'array',
      admin: {
        description:
          'The photo sequence. Editorial range is 12-20 frames - shorter or longer is allowed but should be deliberate.',
      },
      fields: [
        { name: 'frame', type: 'relationship', relationTo: 'frames', required: true },
        { name: 'captionOverride', type: 'textarea' },
      ],
    },
    { name: 'contributors', type: 'relationship', relationTo: 'people', hasMany: true },
    { name: 'relatedWalk', type: 'relationship', relationTo: 'walks' },
    { name: 'relatedPhotocall', type: 'relationship', relationTo: 'photocalls' },
    { name: 'publishedDate', type: 'date' },
    { name: 'tags', type: 'text', hasMany: true },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        // A published essay must actually contain a sequence.
        if (data?._status === 'published') {
          const sequence = data?.sequence ?? originalDoc?.sequence ?? []
          if (!Array.isArray(sequence) || sequence.length < 1) {
            throw new APIError(
              'A published essay needs at least one frame in its sequence.',
              400,
            )
          }
        }
        return data
      },
    ],
  },
}
