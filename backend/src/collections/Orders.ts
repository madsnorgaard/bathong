import type { Access, CollectionConfig } from 'payload'
import { isAdmin } from '../access'

/** Users see their own orders; admins see everything. */
const canReadOrder: Access = ({ req: { user } }) => {
  if (!user) return false
  if ((user.roles as string[] | undefined)?.includes('admin')) return true
  return { user: { equals: user.id } }
}

/**
 * Payments are deferred - this is schema only. Orders are created exclusively
 * through the local API by the (future) payment integration, never via REST.
 */
export const Orders: CollectionConfig = {
  slug: 'orders',
  admin: {
    useAsTitle: 'providerRef',
    defaultColumns: ['user', 'type', 'amount', 'status', 'provider'],
    group: 'System',
    hidden: ({ user }) => !(user?.roles as string[] | undefined)?.includes('admin'),
  },
  access: {
    create: () => false,
    read: canReadOrder,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    { name: 'user', type: 'relationship', relationTo: 'users' },
    {
      name: 'type',
      type: 'select',
      options: [
        { label: 'Membership', value: 'membership' },
        { label: 'Walk', value: 'walk' },
      ],
    },
    { name: 'item', type: 'relationship', relationTo: 'walks' },
    { name: 'amount', type: 'number' },
    { name: 'currency', type: 'text', defaultValue: 'ZAR' },
    {
      name: 'status',
      type: 'select',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Paid', value: 'paid' },
        { label: 'Failed', value: 'failed' },
        { label: 'Cancelled', value: 'cancelled' },
        { label: 'Refunded', value: 'refunded' },
      ],
    },
    {
      name: 'provider',
      type: 'select',
      options: [
        { label: 'PayFast', value: 'payfast' },
        { label: 'Manual', value: 'manual' },
      ],
    },
    { name: 'providerRef', type: 'text' },
    { name: 'raw', type: 'json', admin: { description: 'Raw provider payload for auditing.' } },
  ],
}
