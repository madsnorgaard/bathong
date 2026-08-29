import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin, isEditor, publishedOrEditor } from '../access'
import { assertWalksInPast, pastWalksOnly } from '../fields/walkLinks'

export const Essays: CollectionConfig = {
  slug: 'essays',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'publishedDate', 'walks', '_status'],
    group: 'Work',
  },
  versions: { drafts: true, maxPerDoc: 25 },
  access: { read: publishedOrEditor, create: isEditor, update: isEditor, delete: isAdmin },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', unique: true, index: true },
    { name: 'deck', type: 'textarea', admin: { description: 'Short standfirst under the title.' } },
    { name: 'body', type: 'richText' },
    {
      name: 'leadFrame',
      type: 'relationship',
      relationTo: 'frames',
      admin: {
        components: { Field: '@/fields/sequence/LeadFrameField#LeadFrameField' },
      },
    },
    {
      // The edit decides the layout (W2): single frames, paired frames where
      // the edit pairs them, text interleaved where the sequence needs it.
      name: 'sequence',
      type: 'blocks',
      admin: {
        description:
          'The photo sequence. Editorial range is 12-20 frames - shorter or longer is allowed but should be deliberate. Full bleed is a device: the opening frame and at most one turn in the middle.',
        // Visual editor: thumbnail strip + picker drawer; the stock blocks UI
        // stays embedded inside it as the structural escape hatch.
        components: { Field: '@/fields/sequence/SequenceEditor#SequenceEditor' },
      },
      blocks: [
        {
          slug: 'frame',
          fields: [
            { name: 'frame', type: 'relationship', relationTo: 'frames', required: true },
            { name: 'captionOverride', type: 'textarea' },
            {
              name: 'fullBleed',
              type: 'checkbox',
              defaultValue: false,
              admin: { description: 'At most two per essay; the hook enforces it.' },
            },
          ],
        },
        {
          slug: 'pair',
          fields: [
            { name: 'left', type: 'relationship', relationTo: 'frames', required: true },
            { name: 'right', type: 'relationship', relationTo: 'frames', required: true },
            { name: 'captionOverride', type: 'textarea' },
          ],
        },
        {
          slug: 'text',
          fields: [{ name: 'body', type: 'richText', required: true }],
        },
      ],
    },
    { name: 'contributors', type: 'relationship', relationTo: 'people', hasMany: true },
    {
      name: 'walks',
      type: 'relationship',
      relationTo: 'walks',
      hasMany: true,
      filterOptions: pastWalksOnly,
      admin: {
        description:
          'The walk(s) this essay came out of. Only walks that have already happened.',
      },
    },
    { name: 'relatedPhotocall', type: 'relationship', relationTo: 'photocalls' },
    { name: 'publishedDate', type: 'date' },
    { name: 'tags', type: 'text', hasMany: true },
  ],
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (data?.walks !== undefined) await assertWalksInPast(data.walks, req, 'essay')
        const sequence = data?.sequence ?? originalDoc?.sequence ?? []
        // A published essay must actually contain frames.
        if (data?._status === 'published') {
          const frameBlocks = Array.isArray(sequence)
            ? sequence.filter((b: { blockType?: string }) => b.blockType !== 'text')
            : []
          if (frameBlocks.length < 1) {
            throw new APIError(
              'A published essay needs at least one frame in its sequence.',
              400,
            )
          }
        }
        // Full bleed is a device, used at most twice per essay.
        if (Array.isArray(sequence)) {
          const bleeds = sequence.filter(
            (b: { blockType?: string; fullBleed?: boolean }) =>
              b.blockType === 'frame' && b.fullBleed,
          ).length
          if (bleeds > 2) {
            throw new APIError('Full bleed is used at most twice per essay.', 400)
          }
        }
        return data
      },
    ],
  },
}
