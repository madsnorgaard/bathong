import type { CollectionConfig } from 'payload'
import { hasEditorRole, isEditor } from '../access'
import { NOTICE_KINDS } from '../lib/membership'

/**
 * One row per notice a membership was sent, or overtaken, around one
 * expiry date (#83): the record the nightly job checks before it mails, so
 * a re-run never sends twice. Written by the job alone (overrideAccess);
 * editors read it. Deleting the account leaves the rows pointing at nobody.
 */
export const MembershipNotices: CollectionConfig = {
  slug: 'membership-notices',
  admin: {
    useAsTitle: 'kind',
    defaultColumns: ['user', 'kind', 'expires', 'outcome', 'sentAt'],
    group: 'System',
    hidden: ({ user }) => !hasEditorRole(user),
    description: 'Renewal reminders and lapse notices the nightly job has sent.',
  },
  access: {
    create: () => false,
    read: isEditor,
    update: () => false,
    delete: () => false,
  },
  defaultSort: '-sentAt',
  indexes: [{ fields: ['user', 'kind', 'expires'], unique: true }],
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users', required: true, index: true },
    {
      name: 'kind',
      type: 'select',
      required: true,
      options: NOTICE_KINDS.map((value) => ({ label: value, value })),
    },
    {
      name: 'expires',
      type: 'date',
      required: true,
      admin: { description: 'The expiry this notice was about.' },
    },
    {
      name: 'outcome',
      type: 'select',
      required: true,
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Overtaken', value: 'overtaken' },
      ],
      admin: { description: 'Overtaken: a later notice was due first, so this one never went.' },
    },
    { name: 'sentAt', type: 'date', required: true },
  ],
}
