import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { anyone, isAdmin, isEditor } from '../access'
import { assertWalksInPast, pastWalksOnly } from '../fields/walkLinks'

export const Frames: CollectionConfig = {
  slug: 'frames',
  admin: {
    useAsTitle: 'caption',
    defaultColumns: ['image', 'photographer', 'location', 'year', 'walk', 'topPick'],
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
    {
      name: 'walk',
      type: 'relationship',
      relationTo: 'walks',
      index: true,
      filterOptions: pastWalksOnly,
      admin: {
        description:
          'The walk this frame was made on, if any. Only walks that have already happened.',
      },
    },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (data?.walk !== undefined) await assertWalksInPast(data.walk, req, 'frame')
        // Credit is non-negotiable: every frame names its photographer,
        // either via a People profile or an explicit credit override.
        // A field the request sends (even as null) is the new value; only an
        // absent field falls back to the saved one, so a credit cannot be
        // cleared past the check.
        const photographer =
          data && 'photographer' in data ? data.photographer : originalDoc?.photographer
        const creditOverride =
          data && 'creditOverride' in data ? data.creditOverride : originalDoc?.creditOverride
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
