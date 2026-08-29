import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'

/**
 * One membership, one price (decided 29 Aug 2026): a joining fee that buys
 * the card and the member number, then monthly or annual. No tiers. Prices
 * left empty render the honest placeholder on the site.
 */
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
    {
      name: 'joiningFee',
      type: 'number',
      admin: { description: 'Once, in rand. Includes the card and the member number.' },
    },
    { name: 'priceMonthly', type: 'number', admin: { description: 'Per month, in rand.' } },
    { name: 'priceAnnual', type: 'number', admin: { description: 'Per year, in rand.' } },
    {
      name: 'priceNote',
      type: 'text',
      defaultValue: 'The card and your member number are included. Monthly can stop any time.',
    },
    {
      name: 'openDoorNote',
      type: 'text',
      defaultValue: 'If the fee is what stands between you and the collective, write to us anyway.',
      admin: { description: 'The open door, kept without a tier. Clear it to hide the line.' },
    },
    { name: 'cardImage', type: 'upload', relationTo: 'media' },
    { name: 'joinUrl', type: 'text', admin: { description: 'Where "Join" goes. Empty falls back to the contact mailbox.' } },
  ],
}
