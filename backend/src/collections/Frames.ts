import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { anyone, isAdmin, isEditor } from '../access'

export const Frames: CollectionConfig = {
  slug: 'frames',
  admin: {
    useAsTitle: 'caption',
    defaultColumns: ['image', 'photographer', 'location', 'year', 'topPick'],
    group: 'Work',
  },
  access: { read: anyone, create: isEditor, update: isEditor, delete: isAdmin },
  fields: [
    { name: 'image', type: 'upload', relationTo: 'media', required: true },
    { name: 'photographer', type: 'relationship', relationTo: 'people' },
    {
      name: 'creditOverride',
      type: 'text',
      admin: {
        description:
          'Use when the photographer has no People profile. Every frame must carry a credit.',
      },
    },
    { name: 'caption', type: 'textarea' },
    { name: 'location', type: 'text' },
    { name: 'year', type: 'number' },
    { name: 'tags', type: 'text', hasMany: true },
    {
      name: 'topPick',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description:
          'Top picks rotate as the homepage lead frame. With none ticked, the newest frame leads.',
      },
    },
    {
      name: 'sourceSubmission',
      type: 'relationship',
      relationTo: 'submissions',
      admin: { description: 'Set when this frame was promoted from a photocall submission.' },
    },
  ],
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        // Credit is non-negotiable: every frame names its photographer,
        // either via a People profile or an explicit credit override.
        const photographer = data?.photographer ?? originalDoc?.photographer
        const creditOverride = data?.creditOverride ?? originalDoc?.creditOverride
        if (!photographer && !creditOverride) {
          throw new APIError(
            'A frame must credit its photographer - set a photographer or a credit override.',
            400,
          )
        }
        return data
      },
    ],
  },
}
