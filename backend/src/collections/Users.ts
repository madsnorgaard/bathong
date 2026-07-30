import type { CollectionConfig } from 'payload'
import { hasEditorRole, isAdmin, isAdminField } from '../access'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000, // 10 minutes
    // Cross-subdomain cookies: the frontend and API live on sibling subdomains,
    // so in production the cookie must be scoped to the parent domain and sent
    // cross-site. Leave COOKIE_DOMAIN unset in dev (plain http, same origin).
    ...(process.env.COOKIE_DOMAIN
      ? {
          cookies: {
            domain: process.env.COOKIE_DOMAIN,
            sameSite: 'None' as const,
            secure: true,
          },
        }
      : {}),
  },
  admin: { useAsTitle: 'name', group: 'System' },
  access: {
    // First-user creation bypasses access automatically.
    create: isAdmin,
    // Members see themselves; editors and admins see everyone.
    read: ({ req: { user } }) => {
      if (!user) return false
      if (hasEditorRole(user)) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if ((user.roles as string[] | undefined)?.includes('admin')) return true
      return { id: { equals: user.id } }
    },
    delete: isAdmin,
    // Admin panel is for the editorial circle only; members use the site.
    admin: ({ req: { user } }) => hasEditorRole(user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['member'],
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'Member', value: 'member' },
      ],
      access: { update: isAdminField },
    },
    {
      name: 'profile',
      type: 'relationship',
      relationTo: 'people',
      admin: { description: 'Link to a public People profile, if this user has one.' },
    },
    {
      name: 'membershipTier',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Individual', value: 'individual' },
        { label: 'Student', value: 'student' },
      ],
      access: { update: isAdminField },
    },
    {
      name: 'membershipStatus',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Active', value: 'active' },
        { label: 'Lapsed', value: 'lapsed' },
      ],
      access: { update: isAdminField },
    },
    {
      name: 'membershipExpires',
      type: 'date',
      access: { update: isAdminField },
    },
  ],
}
