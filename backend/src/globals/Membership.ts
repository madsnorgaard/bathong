import type { GlobalConfig } from 'payload'
import { anyone, isEditor } from '../access'

/**
 * One membership, one price (decided 29 Aug 2026): a joining fee once, then
 * monthly or annual. No tiers. The card and the member number are the
 * kicker, and they belong to subscribing members only. Prices left empty
 * render the honest placeholder on the site.
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
      admin: { description: 'Once, in rand, for everyone who joins.' },
    },
    { name: 'priceMonthly', type: 'number', admin: { description: 'Per month, in rand.' } },
    { name: 'priceAnnual', type: 'number', admin: { description: 'Per year, in rand.' } },
    {
      name: 'priceNote',
      type: 'text',
      defaultValue:
        'The card and your member number come with a monthly or annual membership. Monthly can stop any time.',
      admin: { description: 'The kicker under the prices: what subscribing gets you.' },
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
