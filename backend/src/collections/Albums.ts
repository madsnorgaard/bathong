import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'
import { assertWalksInPast, pastWalksOnly } from '../fields/walkLinks'
import { formatSlug } from '../fields/slug'

/**
 * Albums are the softer record of a walk: group photographs, the edit table,
 * the coffee after. They hold plain media, not frames, so nothing in an
 * album ever enters the archive or the essay picker.
 */
export const Albums: CollectionConfig = {
  slug: 'albums',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'photographer', 'walks', '_status'],
    group: 'Work',
  },
  versions: { drafts: true, maxPerDoc: 10 },
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isAdmin },
  defaultSort: '-date',
  fields: [
    { name: 'title', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        description:
          'One URL segment, made from the title when empty: /albums/<slug>. Slashes and spaces are folded into hyphens.',
      },
    },
    {
      name: 'intro',
      type: 'textarea',
      admin: { description: 'A few lines on what this album is. Optional.' },
    },
    {
      name: 'images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      required: true,
      minRows: 1,
      admin: {
        description:
          "Plain photographs, not frames: album images never enter the archive. The caption on the site is each file's alt text.",
      },
    },
    {
      name: 'walks',
      type: 'relationship',
      relationTo: 'walks',
      hasMany: true,
      filterOptions: pastWalksOnly,
      admin: {
        description: 'The walk(s) these photographs are from. Only walks that have already happened.',
      },
    },
    { name: 'photographer', type: 'relationship', relationTo: 'people' },
    {
      name: 'creditOverride',
      type: 'text',
      admin: {
        description:
          'Use when the photographer has no People profile. Every album must carry a credit.',
      },
    },
    {
      name: 'date',
      type: 'date',
      admin: { date: { pickerAppearance: 'dayOnly', displayFormat: 'd MMM yyyy' } },
    },
    { name: 'publishedDate', type: 'date' },
  ],
  hooks: {
    beforeValidate: [
      formatSlug,
      async ({ data, originalDoc, req }) => {
        // Credit is non-negotiable here too: album photographs are shown
        // with a name on them, the same as every frame.
        // A field the request sends (even as null) is the new value; only an
        // absent field falls back to the saved one, so a credit cannot be
        // cleared past the check.
        const photographer =
          data && 'photographer' in data ? data.photographer : originalDoc?.photographer
        const creditOverride =
          data && 'creditOverride' in data ? data.creditOverride : originalDoc?.creditOverride
        if (!photographer && !creditOverride) {
          throw new APIError(
            'An album must credit its photographer - set a photographer or a credit override.',
            400,
          )
        }
        if (data?.walks !== undefined) await assertWalksInPast(data.walks, req, 'album')
        return data
      },
    ],
  },
}
