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
    {
      name: 'joinUrl',
      type: 'text',
      admin: {
        description: 'Leave empty: Join goes to sign-up on the site. Set only to send joining elsewhere.',
      },
    },
    {
      name: 'referencePrefix',
      type: 'text',
      defaultValue: 'BTG',
      maxLength: 6,
      admin: { description: 'EFT references read PREFIX-XXXXXX. Letters and digits only.' },
    },
    {
      // Only signed-in accounts read the bank details: they are shown on the
      // join page and in the join email, never on a public page.
      name: 'bank',
      type: 'group',
      label: 'Bank details (join page, signed-in members only)',
      access: { read: ({ req }) => Boolean(req.user) },
      fields: [
        { name: 'accountName', type: 'text' },
        { name: 'bankName', type: 'text' },
        { name: 'accountNumber', type: 'text' },
        { name: 'branchCode', type: 'text' },
        { name: 'accountType', type: 'text', admin: { description: 'Cheque, savings...' } },
        {
          name: 'paymentNote',
          type: 'textarea',
          defaultValue:
            'Use the reference exactly as shown. We confirm EFTs by hand, usually within two working days.',
        },
      ],
    },
  ],
}
